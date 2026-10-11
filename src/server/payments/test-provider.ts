import "server-only";
import { env, isProduction } from "@/server/env";
import { hmacSha256Hex, randomToken, safeEqual } from "@/server/crypto";
import type { NormalizedPaymentEvent, PaymentProvider } from "./types";

/**
 * Isolated TEST payment adapter. No money moves and no external service is
 * contacted. Simulated events are HMAC-signed and go through exactly the same
 * processing code as real provider webhooks. Refused when APP_ENV=production.
 */
function assertNotProduction() {
  if (isProduction()) throw new Error("The test payment adapter is disabled in production.");
}

export const TEST_SIGNATURE_HEADER = "x-test-payment-signature";

export function signTestEvent(body: string): string {
  assertNotProduction();
  return hmacSha256Hex(env.TEST_PAYMENT_WEBHOOK_SECRET!, body);
}

export type TestEventBody =
  | {
      event: "payment.captured" | "payment.failed";
      providerOrderId: string;
      providerPaymentId: string;
      amount: number;
      currency: string;
      reason?: string;
    }
  | { event: "refund.processed" | "refund.failed"; providerPaymentId: string; providerRefundId: string; amount: number };

export const testProvider: PaymentProvider = {
  id: "test",

  async createPaymentOrder() {
    assertNotProduction();
    return { providerOrderId: `test_order_${randomToken(12)}` };
  },

  clientConfig({ providerOrderId, amount, currency }) {
    return { provider: "test", providerOrderId, amount, currency };
  },

  parseWebhook(rawBody, headers): NormalizedPaymentEvent | null {
    assertNotProduction();
    const signature = headers.get(TEST_SIGNATURE_HEADER);
    if (!signature || !env.TEST_PAYMENT_WEBHOOK_SECRET) return null;
    if (!safeEqual(hmacSha256Hex(env.TEST_PAYMENT_WEBHOOK_SECRET, rawBody), signature)) return null;
    const body = JSON.parse(rawBody) as TestEventBody;
    switch (body.event) {
      case "payment.captured":
      case "payment.failed":
        return {
          eventId: `${body.event}:${body.providerPaymentId}`,
          type: body.event,
          providerOrderId: body.providerOrderId,
          providerPaymentId: body.providerPaymentId,
          amount: body.amount,
          currency: body.currency,
          failureReason: body.event === "payment.failed" ? (body.reason ?? "Simulated failure") : null,
          raw: body,
        };
      case "refund.processed":
      case "refund.failed":
        return {
          eventId: `${body.event}:${body.providerRefundId}`,
          type: body.event,
          providerPaymentId: body.providerPaymentId,
          providerRefundId: body.providerRefundId,
          amount: body.amount,
          raw: body,
        };
      default:
        return { eventId: `ignored:${randomToken(8)}`, type: "ignored", raw: body };
    }
  },

  async refund() {
    assertNotProduction();
    // Settles asynchronously like a real provider; the caller emits a signed refund.processed event.
    return { providerRefundId: `test_rfnd_${randomToken(12)}`, status: "pending" };
  },
};
