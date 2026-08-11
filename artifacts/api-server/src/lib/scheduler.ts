/**
 * Server-side delivery worker.
 *
 * Responsibilities:
 *   1. Deliver due scheduled messages (atomic claim prevents duplicates).
 *   2. Generate birthday / anniversary reminders from relationship_events.
 *   3. Generate monthly Memory Capsules at month-end.
 *
 * All three jobs are safe to poll every 60 s because they use dedup_key
 * on the notifications table and UNIQUE constraints to prevent double-work.
 */
import { and, eq, lte, or, sql } from "drizzle-orm";
import {
  db, pool, scheduledMessagesTable, notificationsTable, usersTable,
  relationshipEventsTable, monthlyCapsulesTable, memoriesTable,
  relationshipStreaksTable, relationshipEventRemindersTable,
} from "@workspace/db";
import { emitToUser } from "../routes/events";
import pino from "pino";

const logger = pino({ name: "scheduler" });
const POLL_INTERVAL_MS = 60_000;

// ── 1. Scheduled message delivery ─────────────────────────────────────────

async function processDueMessages() {
  const now = new Date();

  const claimed = await db
    .update(scheduledMessagesTable)
    .set({ status: "processing" })
    .where(and(
      eq(scheduledMessagesTable.status, "scheduled"),
      lte(scheduledMessagesTable.deliveryTimestamp, now),
    ))
    .returning();

  if (claimed.length === 0) return;

  logger.info({ count: claimed.length }, "Processing due scheduled messages");

  for (const msg of claimed) {
    try {
      const [recipient, sender] = await Promise.all([
        db.query.usersTable.findFirst({ where: eq(usersTable.id, msg.recipientUserId) }),
        db.query.usersTable.findFirst({ where: eq(usersTable.id, msg.senderUserId) }),
      ]);

      if (!recipient || !sender) {
        await db.update(scheduledMessagesTable).set({ status: "failed" }).where(eq(scheduledMessagesTable.id, msg.id));
        continue;
      }

      await db.insert(notificationsTable).values({
        userId: msg.recipientUserId,
        type: "scheduled_message_received",
        title: msg.title ?? "A message arrived 💜",
        message: `${sender.firstName ?? "Someone"} sent you a message right on time 💜`,
      }).onConflictDoNothing();

      await db.update(scheduledMessagesTable).set({ status: "sent", sentAt: now }).where(eq(scheduledMessagesTable.id, msg.id));

      emitToUser(msg.recipientUserId, "scheduledMessage.received", { id: msg.id });

      // Yearly repeat
      if (msg.repeatType === "yearly") {
        const baseDelivery = new Date(msg.deliveryTimestamp);
        const tz = msg.deliveryTimezone ?? "UTC";
        let nextDelivery: Date;
        try {
          const inTz = new Intl.DateTimeFormat("en-US", {
            timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
          }).formatToParts(baseDelivery);
          const get = (type: string) => inTz.find((p) => p.type === type)?.value ?? "00";
          const localStr = `${Number(get("year")) + 1}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
          nextDelivery = new Date(new Date(`${localStr}Z`).toLocaleString("en-US", { timeZone: "UTC" }));
        } catch {
          nextDelivery = new Date(baseDelivery);
          nextDelivery.setFullYear(nextDelivery.getFullYear() + 1);
        }
        await db.insert(scheduledMessagesTable).values({
          senderUserId: msg.senderUserId, recipientUserId: msg.recipientUserId,
          title: msg.title, message: msg.message, mediaUrls: msg.mediaUrls,
          deliveryTimestamp: nextDelivery, deliveryTimezone: msg.deliveryTimezone,
          occasionType: msg.occasionType, repeatType: "yearly", status: "scheduled",
        });
      }

      logger.info({ messageId: msg.id }, "Scheduled message delivered");
    } catch (err) {
      logger.error({ messageId: msg.id, err }, "Failed to deliver scheduled message");
      await db.update(scheduledMessagesTable).set({ status: "failed" }).where(eq(scheduledMessagesTable.id, msg.id));
    }
  }
}

// ── 2. Birthday / anniversary reminders ──────────────────────────────────

async function processBirthdayReminders() {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

  // Fetch all relationship events
  const events = await db.query.relationshipEventsTable.findMany();

  for (const ev of events) {
    const reminderDays = (ev.reminderDays ?? "7,3,1,0")
      .split(",")
      .map((d) => parseInt(d, 10))
      .filter((d) => !isNaN(d));

    const thisYear = now.getFullYear();
    let nextDate = new Date(thisYear, ev.eventMonth - 1, ev.eventDay);
    if (nextDate < now) nextDate = new Date(thisYear + 1, ev.eventMonth - 1, ev.eventDay);

    const daysUntil = Math.ceil((nextDate.getTime() - now.setHours(0, 0, 0, 0)) / 86_400_000);
    // Reset now (it was mutated by setHours)
    now.setTime(Date.now());

    for (const days of reminderDays) {
      if (daysUntil !== days) continue;

      const eventDateStr = nextDate.toISOString().split("T")[0];
      const dedupKey = `re_${ev.id}_${eventDateStr}_${days}d`;

      let title: string;
      let message: string;

      if (days === 0) {
        // Today — check if a scheduled wish exists
        title = `${ev.title} is today 🎂`;
        message = `Don't forget — today is ${ev.title}. You can write a wish or share a memory.`;
      } else if (days === 1) {
        title = `${ev.title} is tomorrow 🎂`;
        message = `${ev.title} is tomorrow. You still have time to write something meaningful.`;
      } else {
        title = `${ev.title} is in ${days} days`;
        message = `A little reminder: ${ev.title} is coming up on ${eventDateStr}.`;
      }

      try {
        // Insert into relationship_event_reminders for proper tracking + dedup
        const scheduledFor = new Date(nextDate);
        scheduledFor.setHours(9, 0, 0, 0); // Deliver at 9am local-ish

        const inserted = await db
          .insert(relationshipEventRemindersTable)
          .values({
            eventId: ev.id,
            userId: ev.ownerUserId,
            reminderType: `${days}_day`,
            scheduledFor,
            status: "sent",
            dedupeKey: dedupKey,
            sentAt: now,
          })
          .onConflictDoNothing()
          .returning();

        // Only emit notification if we actually inserted (not a duplicate)
        if (inserted.length === 0) continue;

        await db.insert(notificationsTable).values({
          userId: ev.ownerUserId,
          type: days === 0 ? "birthday_today" : "birthday_upcoming",
          title,
          message,
          dedupeKey: dedupKey,
        } as any).onConflictDoNothing();

        emitToUser(ev.ownerUserId, "reminder.birthday", { eventId: ev.id, daysUntil: days, title });

      } catch { /* dedup collision — already sent */ }
    }
  }
}

// ── 3. Monthly Memory Capsule generation ─────────────────────────────────

async function processMonthlyCapsulesIfNeeded() {
  const now = new Date();
  // Only generate on the 1st–3rd of each month (for the previous month)
  if (now.getDate() > 3) return;

  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prevMonth.getFullYear();
  const month = prevMonth.getMonth() + 1; // 1-based
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  // Get all users who have at least one memory from that month
  let userIds: string[] = [];
  try {
    const rows = await pool.query<{ user_id: string }>(
      `SELECT DISTINCT user_id FROM memories WHERE user_id IS NOT NULL AND to_char(date::date,'YYYY-MM') = $1`,
      [monthStr],
    );
    userIds = rows.rows.map((r) => r.user_id).filter(Boolean);
  } catch (err) {
    logger.error({ err }, "Failed to query users for monthly capsule");
    return;
  }

  for (const userId of userIds) {
    try {
      // Skip if already generated
      const existing = await db.query.monthlyCapsulesTable.findFirst({
        where: and(
          eq(monthlyCapsulesTable.userId, userId),
          eq(monthlyCapsulesTable.year, year),
          eq(monthlyCapsulesTable.month, month),
        ),
      });
      if (existing) continue;

      // Generate summary
      const memories = await db.query.memoriesTable.findMany({
        where: (t, { eq: eq2, and: and2, sql: sql2 }) => and2(
          eq2(t.userId, userId),
          sql2`to_char(${t.date}::date, 'YYYY-MM') = ${monthStr}`,
        ),
      });
      if (memories.length === 0) continue;

      const categoryCounts: Record<string, number> = {};
      for (const m of memories) categoryCounts[m.category] = (categoryCounts[m.category] ?? 0) + 1;

      const streaks = await db.query.relationshipStreaksTable.findMany({
        where: or(eq(relationshipStreaksTable.userAId, userId), eq(relationshipStreaksTable.userBId, userId)),
        orderBy: (t, { desc }) => [desc(t.currentStreak)],
        limit: 3,
      });

      const photoMemories = memories.filter((m) => m.photoUrls && m.photoUrls.length > 0);
      const forgotten = memories.filter((m) => !m.isKeptClose).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;

      const summaryData = {
        year, month,
        memoriesCount: memories.length,
        photoCount: photoMemories.length,
        categories: categoryCounts,
        topCategory: Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
        keptCloseCount: memories.filter((m) => m.isKeptClose).length,
        longestStreak: streaks[0]?.currentStreak ?? 0,
        bestPhotoUrl: photoMemories[0]?.photoUrls?.[0] ?? null,
        bestPhotoTitle: photoMemories[0]?.title ?? null,
        forgottenMemory: forgotten ? { id: forgotten.id, title: forgotten.title, date: forgotten.date } : null,
      };

      await db.insert(monthlyCapsulesTable).values({ userId, year, month, summaryData }).onConflictDoNothing();

      // Notify the user
      const monthName = prevMonth.toLocaleString("en-US", { month: "long" });
      await db.insert(notificationsTable).values({
        userId,
        type: "monthly_capsule",
        title: `Your ${monthName} is wrapped 🎁`,
        message: `${memories.length} little moment${memories.length !== 1 ? "s" : ""} from ${monthName}. Tap to open.`,
        // @ts-ignore
        dedup_key: `capsule_${userId}_${year}_${month}`,
      }).onConflictDoNothing();

      emitToUser(userId, "monthlyCapsule.ready", { year, month });

      logger.info({ userId, year, month }, "Monthly capsule generated");
    } catch (err) {
      logger.error({ userId, year, month, err }, "Failed to generate monthly capsule");
    }
  }
}

// ── Poll loop ─────────────────────────────────────────────────────────────

async function poll() {
  await processDueMessages().catch((err) => logger.error({ err }, "processDueMessages failed"));
  await processBirthdayReminders().catch((err) => logger.error({ err }, "processBirthdayReminders failed"));
  await processMonthlyCapsulesIfNeeded().catch((err) => logger.error({ err }, "processMonthlyCapsulesIfNeeded failed"));
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduler() {
  if (schedulerInterval) return;
  logger.info("Scheduler started — polling every 60s");
  poll().catch((err) => logger.error({ err }, "Scheduler initial run failed"));
  schedulerInterval = setInterval(() => poll().catch((err) => logger.error({ err }, "Scheduler poll failed")), POLL_INTERVAL_MS);
}

export function stopScheduler() {
  if (schedulerInterval) { clearInterval(schedulerInterval); schedulerInterval = null; }
}
