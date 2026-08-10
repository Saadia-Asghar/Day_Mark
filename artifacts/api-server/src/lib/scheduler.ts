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

  // Atomically claim due scheduled messages
  const due = await db
    .update(scheduledMessagesTable)
    .set({ status: "sent", sentAt: now })
    .where(
      and(
        eq(scheduledMessagesTable.status, "scheduled"),
        lte(scheduledMessagesTable.deliveryTimestamp, now),
      ),
    )
    .returning();

  if (due.length === 0) return;

  logger.info({ count: due.length }, "Processing due scheduled messages");

  for (const msg of due) {
    try {
      // Verify recipient still exists
      const recipient = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, msg.recipientUserId),
      });
      if (!recipient) {
        await db.update(scheduledMessagesTable).set({ status: "failed" }).where(eq(scheduledMessagesTable.id, msg.id));
        continue;
      }

      // Create notification for recipient
      await db.insert(notificationsTable).values({
        userId: msg.recipientUserId,
        type: "scheduled_message_received",
        title: msg.title ?? "A message arrived 💜",
        message: `A message from ${msg.senderUserId} arrived right on time 💜`,
      });

      // Emit real-time SSE if recipient is online
      emitToUser(msg.recipientUserId, "scheduledMessage.received", { id: msg.id });

      // Handle yearly repeat — schedule next year's message
      if (msg.repeatType === "yearly") {
        const nextDelivery = new Date(msg.deliveryTimestamp);
        nextDelivery.setFullYear(nextDelivery.getFullYear() + 1);
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
      logger.error({ messageId: msg.id, err }, "Failed to deliver scheduled message");
      await db.update(scheduledMessagesTable).set({ status: "failed" }).where(eq(scheduledMessagesTable.id, msg.id));
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
