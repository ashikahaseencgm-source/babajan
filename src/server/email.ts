import "server-only";
import { db, schema } from "@/server/db";
import { env } from "@/server/env";

/**
 * Transactional email. Two adapters:
 *  - console: writes to server logs and the `email_outbox` table (development).
 *  - resend:  sends through the Resend HTTP API (requires a verified sender domain).
 *
 * Emails are plain text by design: they render reliably everywhere and avoid
 * HTML-injection risks from customer-supplied values.
 */
export type EmailMessage = { to: string; subject: string; text: string };

export async function sendEmail(message: EmailMessage): Promise<{ ok: boolean }> {
  const provider = env.EMAIL_PROVIDER;
  try {
    if (provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.EMAIL_FROM, to: [message.to], subject: message.subject, text: message.text }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Resend responded ${res.status}`);
    } else {
      console.info(`[email:console] To: ${message.to} | Subject: ${message.subject}\n${message.text}\n`);
    }
    await db.insert(schema.emailOutbox).values({ ...message, provider, status: "sent" });
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : "unknown error";
    console.error(`[email] Failed to send "${message.subject}": ${error}`);
    await db
      .insert(schema.emailOutbox)
      .values({ ...message, provider, status: "failed", error })
      .catch(() => {});
    return { ok: false };
  }
}

const signature = "\n\nWith warm regards,\nBabajan Sumangali";

export const emails = {
  verifyEmail: (name: string, url: string): Omit<EmailMessage, "to"> => ({
    subject: "Confirm your email — Babajan Sumangali",
    text: `Hello ${name},\n\nPlease confirm your email address to finish setting up your account:\n${url}\n\nThis link expires in one hour. If you didn't create an account, you can ignore this email.${signature}`,
  }),
  resetPassword: (name: string, url: string): Omit<EmailMessage, "to"> => ({
    subject: "Reset your password — Babajan Sumangali",
    text: `Hello ${name},\n\nWe received a request to reset your password. Choose a new one here:\n${url}\n\nThis link expires in one hour. If you didn't ask for this, no action is needed.${signature}`,
  }),
  orderConfirmed: (o: { orderNumber: string; total: string; url: string; lines: string[] }): Omit<EmailMessage, "to"> => ({
    subject: `Your order ${o.orderNumber} is confirmed`,
    text: `Thank you for your order.\n\nYour order is confirmed. We'll share updates as it moves forward.\n\nOrder ${o.orderNumber}\n${o.lines.join("\n")}\nTotal paid: ${o.total}\n\nView your order: ${o.url}${signature}`,
  }),
  orderShipped: (o: { orderNumber: string; url: string; carrier?: string | null; tracking?: string | null }): Omit<EmailMessage, "to"> => ({
    subject: `Your order ${o.orderNumber} is on its way`,
    text: `Good news — your order ${o.orderNumber} has shipped.${o.carrier ? `\nCarrier: ${o.carrier}` : ""}${o.tracking ? `\nTracking number: ${o.tracking}` : ""}\n\nView your order: ${o.url}${signature}`,
  }),
  orderCancelled: (o: { orderNumber: string; url: string; refundNote: string | null }): Omit<EmailMessage, "to"> => ({
    subject: `Your order ${o.orderNumber} has been cancelled`,
    text: `Your order ${o.orderNumber} has been cancelled.${o.refundNote ? `\n\n${o.refundNote}` : ""}\n\nView your order: ${o.url}${signature}`,
  }),
  orderLink: (o: { orderNumber: string; url: string }): Omit<EmailMessage, "to"> => ({
    subject: `Your order ${o.orderNumber}`,
    text: `Here is the secure link to view order ${o.orderNumber}:\n${o.url}\n\nFor your security, any earlier links to this order no longer work. If you didn't request this, you can ignore this email.${signature}`,
  }),
  newsletterConfirm: (url: string): Omit<EmailMessage, "to"> => ({
    subject: "Confirm your subscription — Babajan Sumangali",
    text: `Please confirm that you'd like to receive news about new arrivals and collections from Babajan Sumangali:\n${url}\n\nIf you didn't sign up, ignore this email and you won't hear from us.${signature}`,
  }),
  contactReceived: (name: string): Omit<EmailMessage, "to"> => ({
    subject: "We've received your message — Babajan Sumangali",
    text: `Hello ${name},\n\nThank you for reaching out. Our team will get back to you as soon as possible.${signature}`,
  }),
};
