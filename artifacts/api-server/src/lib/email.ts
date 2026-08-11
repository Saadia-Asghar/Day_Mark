/**
 * Daymark email utility — powered by Resend.
 *
 * All outbound transactional emails go through this module.
 * Set RESEND_API_KEY in environment secrets to enable sending.
 * If the key is absent the functions log a warning and no-op
 * gracefully so the app still works without email configured.
 */
import { Resend } from "resend";
import pino from "pino";

const logger = pino({ name: "email" });

const FROM_NAME = "Daymark";
// Use Resend's universal test address while no custom domain is configured.
// Replace with your verified domain address (e.g. hello@yourdomain.com) once ready.
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const FROM = `${FROM_NAME} <${FROM_ADDRESS}>`;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    logger.warn("RESEND_API_KEY not set — email sending disabled");
    return null;
  }
  return new Resend(key);
}

// ── Shared layout ─────────────────────────────────────────────────────────────

function layout(emoji: string, heading: string, subheading: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F5F0FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0FF;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(104,71,245,0.10);">
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#6847F5 0%,#9B6FF5 100%);padding:40px 32px 36px;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">${emoji}</div>
          <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">${heading}</h1>
          <p style="margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:14px;line-height:1.5;">${subheading}</p>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="padding:32px 32px 28px;">
          ${bodyHtml}
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="background:#FAF8FF;border-top:1px solid #EAE3FF;padding:18px 32px;text-align:center;">
          <p style="margin:0;color:#B0A0D8;font-size:12px;">
            Sent with 💜 by <strong style="color:#6847F5;">Daymark</strong> &nbsp;·&nbsp; Your memories, beautifully kept
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function button(label: string, url: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding:20px 0 8px;">
      <a href="${url}" style="display:inline-block;padding:15px 36px;background:linear-gradient(135deg,#6847F5,#8B5CF6);color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;border-radius:50px;box-shadow:0 4px 20px rgba(104,71,245,0.35);">
        ${label} →
      </a>
    </td>
  </tr>
</table>`;
}

// ── Email senders ─────────────────────────────────────────────────────────────

/**
 * Birthday / anniversary reminder.
 */
export async function sendBirthdayReminder({
  to,
  recipientFirstName,
  eventTitle,
  daysUntil,
  appUrl,
}: {
  to: string;
  recipientFirstName: string;
  eventTitle: string;
  daysUntil: number;
  appUrl: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const isToday = daysUntil === 0;
  const emoji = isToday ? "🎂" : "📅";
  const heading = isToday ? `${eventTitle} is today!` : `${eventTitle} in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`;
  const subheading = isToday
    ? "A special day deserves a special moment"
    : "A little heads-up so you have time to make it memorable";

  const body = `
    <p style="margin:0 0 20px;color:#3D2F7F;font-size:15px;line-height:1.6;">
      Hi ${recipientFirstName} 👋 — just a reminder that <strong>${eventTitle}</strong>
      ${isToday ? "is <strong>today</strong>" : `is in <strong>${daysUntil} day${daysUntil === 1 ? "" : "s"}</strong>`}.
      A heartfelt memory or a short message goes a long way.
    </p>
    ${button("Open Daymark", appUrl)}
  `;

  const subject = isToday
    ? `🎂 ${eventTitle} is today!`
    : `📅 ${eventTitle} is in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`;

  try {
    await resend.emails.send({ from: FROM, to, subject, html: layout(emoji, heading, subheading, body) });
    logger.info({ to, eventTitle, daysUntil }, "Birthday reminder sent");
  } catch (err) {
    logger.error({ err, to }, "Failed to send birthday reminder");
  }
}

/**
 * Monthly Memory Capsule is ready.
 */
export async function sendCapsuleReady({
  to,
  recipientFirstName,
  monthName,
  year,
  memoriesCount,
  capsuleUrl,
}: {
  to: string;
  recipientFirstName: string;
  monthName: string;
  year: number;
  memoriesCount: number;
  capsuleUrl: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const body = `
    <p style="margin:0 0 20px;color:#3D2F7F;font-size:15px;line-height:1.6;">
      Hi ${recipientFirstName} 👋 — your <strong>${monthName} ${year}</strong> Memory Capsule
      is ready. You captured <strong>${memoriesCount} little moment${memoriesCount !== 1 ? "s" : ""}</strong> this month.
      Tap below to unwrap them.
    </p>
    ${button("Open my capsule", capsuleUrl)}
    <p style="margin:20px 0 0;color:#A89CC8;font-size:12px;line-height:1.5;">
      Your capsule will be there whenever you're ready — no rush.
    </p>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `🎁 Your ${monthName} Memory Capsule is ready`,
      html: layout("🎁", `Your ${monthName} is wrapped`, "A month of moments, just for you", body),
    });
    logger.info({ to, monthName, year }, "Capsule email sent");
  } catch (err) {
    logger.error({ err, to }, "Failed to send capsule email");
  }
}

/**
 * Scheduled message arrived for a recipient.
 */
export async function sendScheduledMessageArrived({
  to,
  recipientFirstName,
  senderFirstName,
  messageTitle,
  appUrl,
}: {
  to: string;
  recipientFirstName: string;
  senderFirstName: string;
  messageTitle: string;
  appUrl: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const body = `
    <p style="margin:0 0 20px;color:#3D2F7F;font-size:15px;line-height:1.6;">
      Hi ${recipientFirstName} 👋 — <strong>${senderFirstName}</strong> sent you
      a message that was meant to arrive right now: <em>${messageTitle}</em>.
    </p>
    ${button("Read the message", appUrl)}
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `💌 A message arrived from ${senderFirstName}`,
      html: layout("💌", `A message from ${senderFirstName}`, "Timed perfectly, just for you", body),
    });
    logger.info({ to, senderFirstName }, "Scheduled message email sent");
  } catch (err) {
    logger.error({ err, to }, "Failed to send scheduled message email");
  }
}

/**
 * Streak milestone reached.
 */
export async function sendStreakMilestone({
  to,
  recipientFirstName,
  otherPersonName,
  streakDays,
  appUrl,
}: {
  to: string;
  recipientFirstName: string;
  otherPersonName: string;
  streakDays: number;
  appUrl: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const body = `
    <p style="margin:0 0 20px;color:#3D2F7F;font-size:15px;line-height:1.6;">
      Hi ${recipientFirstName} 👋 — you and <strong>${otherPersonName}</strong> just hit a
      <strong>${streakDays}-day Daylink streak</strong>! ✨ That's ${streakDays} days of staying connected.
      Keep it going!
    </p>
    ${button("See your streak", appUrl)}
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `✨ ${streakDays}-day streak with ${otherPersonName}!`,
      html: layout("✨", `${streakDays} days together!`, `You and ${otherPersonName} are on a roll`, body),
    });
    logger.info({ to, streakDays }, "Streak milestone email sent");
  } catch (err) {
    logger.error({ err, to }, "Failed to send streak milestone email");
  }
}
