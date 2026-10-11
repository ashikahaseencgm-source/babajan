import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/server/db";
import type { NormalizedPaymentEvent, ProviderId } from "@/server/payments/types";
import { canTransitionOrder } from "@/server/domain/order-state";
import { reacquireReservation } from "./inventory";
import { recomputeRefundState } from "./refunds";

export type PaymentEventOutcome =
  | "duplicate"
  | "ignored"
  | "unknown_payment"
  | "amount_mismatch"
  | "confirmed"
  | "already_paid"
  | "duplicate_payment"
  | "late_payment_restocked"
  | "late_payment_unfulfillable"
  | "paid_after_cancel"
  | "authorized_recorded"
  | "failed_recorded"
  | "refund_processed"
  | "refund_failed"
  | "unknown_refund";

/**
 * Applies a verified provider event exactly once.
 *
 * Idempotency: every event is recorded in `payment_event` under a semantic key
 * (e.g. "payment.captured:pay_123"). The browser callback and the webhook for
 * the same payment share that key, so whichever arrives second is a no-op.
 * Row locks (SELECT … FOR UPDATE) on the payment and order serialise
 * concurrent deliveries.
 *
 * Callers must have verified the event's signature before calling this.
 */
export async function applyPaymentEvent(
  provider: ProviderId,
  event: NormalizedPaymentEvent,
): Promise<{ outcome: PaymentEventOutcome; orderId?: string; newlyConfirmed?: boolean }> {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(schema.paymentEvent)
      .values({ provider, eventId: event.eventId, type: event.type, payload: sanitizePayload(event.raw) })
      .onConflictDoNothing()
      .returning({ id: schema.paymentEvent.id });

    let eventRowId = inserted[0]?.id;
    if (!eventRowId) {
      const [row] = await tx
        .select()
        .from(schema.paymentEvent)
        .where(and(eq(schema.paymentEvent.provider, provider), eq(schema.paymentEvent.eventId, event.eventId)))
        .for("update");
      if (row?.processedAt) return { outcome: "duplicate" as const };
      eventRowId = row!.id;
    }

    const result = await dispatch(tx, provider, event);
    await tx
      .update(schema.paymentEvent)
      .set({ processedAt: new Date(), outcome: result.outcome })
      .where(eq(schema.paymentEvent.id, eventRowId));
    return result;
  });
}

function sanitizePayload(raw: unknown): unknown {
  // Provider payloads may include contact details; we keep the structure for audit but drop card/VPA data.
  try {
    return JSON.parse(
      JSON.stringify(raw, (key, value) => (["card", "vpa", "bank_account", "contact", "email", "token"].includes(key) ? "[redacted]" : value)),
    );
  } catch {
    return null;
  }
}

async function addEvent(tx: Tx, orderId: string, type: string, message: string, customerVisible = false) {
  await tx.insert(schema.orderEvent).values({ orderId, type, message, customerVisible });
}

async function dispatch(
  tx: Tx,
  provider: ProviderId,
  event: NormalizedPaymentEvent,
): Promise<{ outcome: PaymentEventOutcome; orderId?: string; newlyConfirmed?: boolean }> {
  if (event.type === "ignored") return { outcome: "ignored" };

  if (event.type === "refund.processed" || event.type === "refund.failed") {
    const [r] = await tx
      .select()
      .from(schema.refund)
      .where(eq(schema.refund.providerRefundId, event.providerRefundId))
      .for("update");
    if (!r) return { outcome: "unknown_refund" };
    await tx
      .update(schema.refund)
      .set({ status: event.type === "refund.processed" ? "processed" : "failed" })
      .where(eq(schema.refund.id, r.id));
    await addEvent(
      tx,
      r.orderId,
      event.type,
      event.type === "refund.processed" ? `Refund of ${r.amount / 100} INR processed by provider.` : `Refund ${event.providerRefundId} failed at provider.`,
      event.type === "refund.processed",
    );
    await recomputeRefundState(tx, r.orderId);
    if (event.type === "refund.failed") {
      await tx.update(schema.order).set({ needsAttention: true }).where(eq(schema.order.id, r.orderId));
    }
    return { outcome: event.type === "refund.processed" ? "refund_processed" : "refund_failed", orderId: r.orderId };
  }

  if (!("providerOrderId" in event)) return { outcome: "ignored" };
  return dispatchPayment(tx, provider, event);
}

async function dispatchPayment(
  tx: Tx,
  provider: ProviderId,
  event: Extract<NormalizedPaymentEvent, { providerOrderId: string }>,
): Promise<{ outcome: PaymentEventOutcome; orderId?: string; newlyConfirmed?: boolean }> {
  const [pay] = await tx
    .select()
    .from(schema.payment)
    .where(and(eq(schema.payment.provider, provider), eq(schema.payment.providerOrderId, event.providerOrderId)))
    .for("update");
  if (!pay) return { outcome: "unknown_payment" };

  const [order] = await tx.select().from(schema.order).where(eq(schema.order.id, pay.orderId)).for("update");
  if (!order) return { outcome: "unknown_payment" };

  if (event.type === "payment.failed") {
    if (pay.status === "created" || pay.status === "authorized") {
      await tx
        .update(schema.payment)
        .set({ status: "failed", providerPaymentId: event.providerPaymentId, failureReason: event.failureReason?.slice(0, 300) ?? null })
        .where(eq(schema.payment.id, pay.id));
    }
    if (order.paymentStatus === "pending") {
      await tx.update(schema.order).set({ paymentStatus: "failed" }).where(eq(schema.order.id, order.id));
    }
    await addEvent(tx, order.id, "payment.failed", `Payment attempt failed${event.failureReason ? `: ${event.failureReason}` : ""}.`);
    return { outcome: "failed_recorded", orderId: order.id };
  }

  if (event.type === "payment.authorized") {
    if (pay.status === "created" || pay.status === "failed") {
      await tx.update(schema.payment).set({ status: "authorized", providerPaymentId: event.providerPaymentId }).where(eq(schema.payment.id, pay.id));
    }
    await addEvent(tx, order.id, "payment.authorized", "Payment authorised; awaiting capture.");
    return { outcome: "authorized_recorded", orderId: order.id };
  }

  // ── payment.captured ──
  if (event.amount !== pay.amount || event.currency !== pay.currency || pay.amount !== order.grandTotal) {
    await tx.update(schema.order).set({ needsAttention: true }).where(eq(schema.order.id, order.id));
    await addEvent(tx, order.id, "payment.amount_mismatch", `Captured amount ${event.amount} ${event.currency} does not match expected ${pay.amount} ${pay.currency}. Not confirming automatically.`);
    return { outcome: "amount_mismatch", orderId: order.id };
  }

  if (order.paymentStatus === "paid" || order.paymentStatus === "partially_refunded" || order.paymentStatus === "refund_pending" || order.paymentStatus === "refunded") {
    if (pay.providerPaymentId === event.providerPaymentId && pay.status === "captured") return { outcome: "already_paid", orderId: order.id };
    // A second, distinct successful payment for an already-paid order: never silently accept.
    await tx.update(schema.order).set({ needsAttention: true }).where(eq(schema.order.id, order.id));
    await addEvent(tx, order.id, "payment.duplicate", `Additional captured payment ${event.providerPaymentId} received for an already-paid order. Refund required.`);
    return { outcome: "duplicate_payment", orderId: order.id };
  }

  await tx
    .update(schema.payment)
    .set({ status: "captured", providerPaymentId: event.providerPaymentId, failureReason: null })
    .where(eq(schema.payment.id, pay.id));

  if (order.status === "cancelled") {
    await tx.update(schema.order).set({ paymentStatus: "paid", paidAt: new Date(), needsAttention: true }).where(eq(schema.order.id, order.id));
    await addEvent(tx, order.id, "payment.after_cancel", "Payment captured after the order was cancelled. Refund required.");
    return { outcome: "paid_after_cancel", orderId: order.id };
  }

  if (order.status === "expired" || !order.stockReserved) {
    const restocked = await reacquireReservation(tx, order.id);
    if (!restocked) {
      await tx
        .update(schema.order)
        .set({ status: "cancelled", paymentStatus: "paid", fulfillmentStatus: "cancelled", paidAt: new Date(), cancelledAt: new Date(), needsAttention: true })
        .where(eq(schema.order.id, order.id));
      await addEvent(tx, order.id, "payment.late_unfulfillable", "Payment arrived after the reservation lapsed and the items are no longer in stock. Order cancelled; full refund required.", true);
      return { outcome: "late_payment_unfulfillable", orderId: order.id };
    }
  }

  if (!canTransitionOrder(order.status, "confirmed")) {
    await tx.update(schema.order).set({ needsAttention: true }).where(eq(schema.order.id, order.id));
    return { outcome: "duplicate_payment", orderId: order.id };
  }

  const updated = await tx
    .update(schema.order)
    .set({ status: "confirmed", paymentStatus: "paid", paidAt: new Date(), reservedUntil: null })
    .where(and(eq(schema.order.id, order.id), sql`${schema.order.status} IN ('pending_payment', 'expired')`))
    .returning({ id: schema.order.id });
  if (updated.length === 0) return { outcome: "already_paid", orderId: order.id };

  await addEvent(tx, order.id, "payment.captured", "Payment received and verified. Order confirmed.", true);
  return { outcome: order.status === "expired" ? "late_payment_restocked" : "confirmed", orderId: order.id, newlyConfirmed: true };
}
