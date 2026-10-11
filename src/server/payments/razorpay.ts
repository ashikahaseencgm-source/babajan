import "server-only";
import { env } from "@/server/env";
import { hmacSha256Hex, safeEqual } from "@/server/crypto";
import type { NormalizedPaymentEvent, PaymentProvider } from "./types";

/**
 * Razorpay integration (Orders API + Checkout + webhooks), using the REST API
 * directly. Requires "auto-capture" to be enabled for payments in the
 * Razorpay dashboard; authorized-but-uncaptured payments are recorded but do
 * not confirm an order.
 */
const API = "https://api.razorpay.com/v1";

function authHeader() {
  return "Basic " + Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
}

async function rzp<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: authHeader(), "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) throw new Error(`Razorpay ${path.split("/")[1]} request failed (${res.status}): ${body.error?.description ?? "unknown error"}`);
  return body;
}

type RzpPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  error_description?: string | null;
};
type RzpRefund = { id: string; payment_id: string; amount: number; status: string };

/** Verifies the signature returned to the browser by Razorpay Checkout. */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const expected = hmacSha256Hex(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`);
  return safeEqual(expected, signature);
}

/** Fetches the authoritative payment state from Razorpay (never trust the browser). */
export async function fetchPayment(paymentId: string): Promise<RzpPayment> {
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) throw new Error("Invalid payment id");
  return rzp<RzpPayment>(`/payments/${paymentId}`);
}

export function paymentToEvent(p: RzpPayment, raw: unknown): NormalizedPaymentEvent {
  const base = { providerOrderId: p.order_id, providerPaymentId: p.id, amount: p.amount, currency: p.currency, raw };
  if (p.status === "captured") return { ...base, eventId: `payment.captured:${p.id}`, type: "payment.captured" };
  if (p.status === "authorized") return { ...base, eventId: `payment.authorized:${p.id}`, type: "payment.authorized" };
  if (p.status === "failed") {
    return { ...base, eventId: `payment.failed:${p.id}`, type: "payment.failed", failureReason: p.error_description ?? null };
  }
  return { eventId: `ignored:${p.id}:${p.status}`, type: "ignored", raw };
}

export const razorpayProvider: PaymentProvider = {
  id: "razorpay",

  async createPaymentOrder({ orderId, orderNumber, amount, currency }) {
    const o = await rzp<{ id: string }>("/orders", {
      method: "POST",
      body: JSON.stringify({ amount, currency, receipt: orderNumber, notes: { order_id: orderId, order_number: orderNumber } }),
    });
    return { providerOrderId: o.id };
  },

  clientConfig({ providerOrderId, amount, currency }) {
    return { provider: "razorpay", keyId: env.RAZORPAY_KEY_ID!, providerOrderId, amount, currency };
  },

  parseWebhook(rawBody, headers) {
    const signature = headers.get("x-razorpay-signature");
    if (!signature || !env.RAZORPAY_WEBHOOK_SECRET) return null;
    const expected = hmacSha256Hex(env.RAZORPAY_WEBHOOK_SECRET, rawBody);
    if (!safeEqual(expected, signature)) return null;

    const body = JSON.parse(rawBody) as {
      event: string;
      payload: { payment?: { entity: RzpPayment }; refund?: { entity: RzpRefund } };
    };
    if (body.event.startsWith("payment.") && body.payload.payment) {
      return paymentToEvent(body.payload.payment.entity, body);
    }
    if ((body.event === "refund.processed" || body.event === "refund.failed") && body.payload.refund) {
      const r = body.payload.refund.entity;
      return {
        eventId: `${body.event}:${r.id}`,
        type: body.event,
        providerPaymentId: r.payment_id,
        providerRefundId: r.id,
        amount: r.amount,
        raw: body,
      };
    }
    return { eventId: `ignored:${headers.get("x-razorpay-event-id") ?? body.event}`, type: "ignored", raw: body };
  },

  async refund({ providerPaymentId, amount, notes }) {
    const r = await rzp<RzpRefund>(`/payments/${providerPaymentId}/refund`, {
      method: "POST",
      body: JSON.stringify({ amount, notes }),
    });
    return { providerRefundId: r.id, status: r.status === "processed" ? "processed" : "pending" };
  },
};
