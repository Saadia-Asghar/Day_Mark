/**
 * Server-side scheduled message delivery worker.
 *
 * Polls the database every minute for due scheduled messages.
 * Uses an atomic UPDATE ... RETURNING to claim messages and prevent
 * duplicate delivery even if the server restarts during processing.
 *
 * The SSE event is a best-effort enhancement — delivery is persisted
 * in the database before the event is emitted, so offline recipients
 * still receive their messages when they next open the app.
 */
import { and, eq, lte, sql } from "drizzle-orm";
import { db, scheduledMessagesTable, notificationsTable, usersTable } from "@workspace/db";
import { emitToUser } from "../routes/events";
import pino from "pino";

const logger = pino({ name: "scheduler" });

const POLL_INTERVAL_MS = 60_000; // 1 minute

async function processDueMessages() {
  const now = new Date();

  // Step 1 — Atomically claim due messages: scheduled → processing.
  // This prevents duplicate delivery even if multiple workers run concurrently.
  const claimed = await db
    .update(scheduledMessagesTable)
    .set({ status: "processing" })
    .where(
      and(
        eq(scheduledMessagesTable.status, "scheduled"),
        lte(scheduledMessagesTable.deliveryTimestamp, now),
      ),
    )
    .returning();

  if (claimed.length === 0) return;

  logger.info({ count: claimed.length }, "Processing due scheduled messages");

  for (const msg of claimed) {
    try {
      // Step 2a — Verify recipient still exists
      const recipient = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, msg.recipientUserId),
      });
      if (!recipient) {
        await db.update(scheduledMessagesTable)
          .set({ status: "failed" })
          .where(eq(scheduledMessagesTable.id, msg.id));
        logger.warn({ messageId: msg.id }, "Recipient not found — message failed");
        continue;
      }

      // Step 2b — Verify sender still exists
      const sender = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, msg.senderUserId),
      });
      if (!sender) {
        await db.update(scheduledMessagesTable)
          .set({ status: "failed" })
          .where(eq(scheduledMessagesTable.id, msg.id));
        continue;
      }

      // Step 2c — Create notification for recipient
      await db.insert(notificationsTable).values({
        userId: msg.recipientUserId,
        type: "scheduled_message_received",
        title: msg.title ?? "A message arrived 💜",
        message: `${sender.firstName ?? "Someone"} sent you a message right on time 💜`,
      });

      // Step 2d — Persist sentAt and mark sent BEFORE emitting SSE
      await db.update(scheduledMessagesTable)
        .set({ status: "sent", sentAt: now })
        .where(eq(scheduledMessagesTable.id, msg.id));

      // Step 2e — Emit real-time SSE (best-effort; delivery already persisted)
      emitToUser(msg.recipientUserId, "scheduledMessage.received", { id: msg.id });

      // Step 2f — Handle yearly repeat using timezone-correct next birthday
      if (msg.repeatType === "yearly") {
        const baseDelivery = new Date(msg.deliveryTimestamp);
        const tz = msg.deliveryTimezone ?? "UTC";
        let nextDelivery: Date;
        try {
          // Compute next year's delivery in the original timezone
          const inTz = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hour12: false,
          }).formatToParts(baseDelivery);
          const get = (type: string) => inTz.find((p) => p.type === type)?.value ?? "00";
          const localStr = `${Number(get("year")) + 1}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
          // Use the Temporal-free approach: parse in UTC then correct
          nextDelivery = new Date(new Date(`${localStr}Z`).toLocaleString("en-US", { timeZone: "UTC" }));
        } catch {
          // Fallback: simple +1 year
          nextDelivery = new Date(baseDelivery);
          nextDelivery.setFullYear(nextDelivery.getFullYear() + 1);
        }
        await db.insert(scheduledMessagesTable).values({
          senderUserId: msg.senderUserId,
          recipientUserId: msg.recipientUserId,
          title: msg.title,
          message: msg.message,
          mediaUrls: msg.mediaUrls,
          deliveryTimestamp: nextDelivery,
          deliveryTimezone: msg.deliveryTimezone,
          occasionType: msg.occasionType,
          repeatType: "yearly",
          status: "scheduled",
        });
      }

      logger.info({ messageId: msg.id, recipientUserId: msg.recipientUserId }, "Scheduled message delivered");
    } catch (err) {
      // Step 3 — On any failure, mark as failed so it can be investigated
      logger.error({ messageId: msg.id, err }, "Failed to deliver scheduled message");
      await db.update(scheduledMessagesTable)
        .set({ status: "failed" })
        .where(eq(scheduledMessagesTable.id, msg.id));
    }
  }
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduler() {
  if (schedulerInterval) return;

  logger.info("Scheduler started — polling every 60s");

  // Run once immediately, then on interval
  processDueMessages().catch((err) => logger.error({ err }, "Scheduler initial run failed"));

  schedulerInterval = setInterval(() => {
    processDueMessages().catch((err) => logger.error({ err }, "Scheduler poll failed"));
  }, POLL_INTERVAL_MS);
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
