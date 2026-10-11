"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { env } from "@/server/env";
import { randomToken, sha256 } from "@/server/crypto";
import { emails, sendEmail } from "@/server/email";
import { limitByIp } from "@/server/rate-limit";
import { contactSchema, emailSchema, fieldErrors } from "@/lib/validation";

export type FormState = { status: "idle" | "success" | "error"; message?: string; errors?: Record<string, string>; values?: Record<string, string> };

/** Newsletter: double opt-in. The response never reveals whether an address is already subscribed. */
export async function subscribeNewsletter(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("company")) return { status: "success", message: "Please check your inbox to confirm your subscription." }; // honeypot
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { status: "error", errors: { email: "Please enter a valid email address." } };
  if (!(await limitByIp("newsletter", 5, 600))) return { status: "error", message: "Too many attempts. Please try again in a few minutes." };

  const email = parsed.data;
  const token = randomToken();
  const [existing] = await db.select().from(schema.newsletterSubscriber).where(eq(schema.newsletterSubscriber.email, email));
  if (existing?.status === "confirmed") {
    return { status: "success", message: "Please check your inbox to confirm your subscription." };
  }
  if (existing) {
    await db
      .update(schema.newsletterSubscriber)
      .set({ status: "pending", tokenHash: sha256(token), consentAt: new Date() })
      .where(eq(schema.newsletterSubscriber.id, existing.id));
  } else {
    await db.insert(schema.newsletterSubscriber).values({ email, tokenHash: sha256(token), consentAt: new Date() });
  }
  await sendEmail({ to: email, ...emails.newsletterConfirm(`${env.APP_URL}/newsletter/confirm?token=${token}`) });
  return { status: "success", message: "Please check your inbox to confirm your subscription." };
}

export async function confirmNewsletter(token: string): Promise<boolean> {
  if (!token || token.length > 100) return false;
  const updated = await db
    .update(schema.newsletterSubscriber)
    .set({ status: "confirmed", confirmedAt: new Date(), tokenHash: sha256(randomToken()) })
    .where(and(eq(schema.newsletterSubscriber.tokenHash, sha256(token)), eq(schema.newsletterSubscriber.status, "pending")))
    .returning({ id: schema.newsletterSubscriber.id });
  return updated.length > 0;
}

/** Contact form with honeypot, minimum fill time and IP rate limiting. */
export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(["name", "email", "orderNumber", "topic", "message"].map((k) => [k, String(formData.get(k) ?? "")]));
  const startedAt = Number(formData.get("startedAt") ?? 0);
  const tooFast = !startedAt || Date.now() - startedAt < 2500;
  if (formData.get("company") || tooFast) {
    // Likely automated. Respond as if successful, but do nothing.
    return { status: "success", message: "Thank you for reaching out. Our team will get back to you as soon as possible." };
  }
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error), values, message: "Please check the highlighted details and try again." };
  if (!(await limitByIp("contact", 5, 3600))) return { status: "error", values, message: "You've sent several messages recently. Please try again later." };

  await db.insert(schema.contactMessage).values(parsed.data);
  await sendEmail({ to: parsed.data.email, ...emails.contactReceived(parsed.data.name) });
  return { status: "success", message: "Thank you for reaching out. Our team will get back to you as soon as possible." };
}

const lookupSchema = z.object({
  orderNumber: z.string().trim().min(5, "Please enter your order number.").max(30),
  email: emailSchema,
});

/** Guest order lookup: always the same response, so it can't be used to probe for orders. */
export async function requestOrderLookup(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { orderNumber: String(formData.get("orderNumber") ?? ""), email: String(formData.get("email") ?? "") };
  const parsed = lookupSchema.safeParse(values);
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error), values };
  if (!(await limitByIp("order-lookup", 5, 900))) return { status: "error", values, message: "Too many attempts. Please try again in 15 minutes." };
  const { requestGuestOrderLink } = await import("@/server/orders/service");
  await requestGuestOrderLink(parsed.data.orderNumber, parsed.data.email);
  return {
    status: "success",
    message: "If those details match an order, we've emailed a secure link to view it. The link replaces any earlier links for that order.",
  };
}
