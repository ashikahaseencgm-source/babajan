export type ProviderId = "razorpay" | "test";

export type NormalizedPaymentEvent =
  | {
      /** Semantic idempotency key, identical whether the event arrives via webhook or client callback. */
      eventId: string;
      type: "payment.captured" | "payment.authorized" | "payment.failed";
      providerOrderId: string;
      providerPaymentId: string;
      amount: number;
      currency: string;
      failureReason?: string | null;
      raw: unknown;
    }
  | {
      eventId: string;
      type: "refund.processed" | "refund.failed";
      providerPaymentId: string;
      providerRefundId: string;
      amount: number;
      raw: unknown;
    }
  | { eventId: string; type: "ignored"; raw: unknown };

export type CreatePaymentOrderInput = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
};

export type ClientCheckoutConfig =
  | { provider: "razorpay"; keyId: string; providerOrderId: string; amount: number; currency: string }
  | { provider: "test"; providerOrderId: string; amount: number; currency: string };

export interface PaymentProvider {
  id: ProviderId;
  createPaymentOrder(input: CreatePaymentOrderInput): Promise<{ providerOrderId: string }>;
  clientConfig(payment: { providerOrderId: string; amount: number; currency: string }): ClientCheckoutConfig;
  /** Verify a webhook request. Returns null if the signature is invalid. */
  parseWebhook(rawBody: string, headers: Headers): NormalizedPaymentEvent | null;
  refund(input: {
    providerPaymentId: string;
    amount: number;
    notes: Record<string, string>;
  }): Promise<{ providerRefundId: string; status: "pending" | "processed" }>;
}
