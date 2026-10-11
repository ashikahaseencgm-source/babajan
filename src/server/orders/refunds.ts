import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/server/db";
import { providerById } from "@/server/payments";
import { audit } from "@/server/audit";
import type { PaymentStatus } from "@/server/domain/order-state";

/** Derives payment status from refund rows. Never set "refunded" by hand. */
export async function recomputeRefundState(tx: Tx, orderId: string) {
  const [o] = await tx.select().from(schema.order).where(eq(schema.order.id, orderId)).for("update");
  if (!o) return;
  const [agg] = await tx
    .select({
      processed: sql<number>`coalesce(sum(${schema.refund.amount}) FILTER (WHERE ${schema.refund.status} = 'processed'), 0)::int`,
      pending: sql<number>`count(*) FILTER (WHERE ${schema.refund.status} = 'pending')::int`,
    })
    .from(schema.refund)
    .where(eq(schema.refund.orderId, orderId));
  let next: PaymentStatus;
  if (agg.processed >= o.grandTotal) next = "refunded";
  else if (agg.pending > 0) next = "refund_pending";
  else if (agg.processed > 0) next = "partially_refunded";
  else next = "paid";
  if (["paid", "refund_pending", "partially_refunded", "refunded"].includes(o.paymentStatus) && o.paymentStatus !== next) {
    await tx.update(schema.order).set({ paymentStatus: next }).where(eq(schema.order.id, orderId));
  }
}

export async function refundableAmount(orderId: string, tx: Tx | typeof db = db): Promise<number> {
  const [o] = await tx.select({ grandTotal: schema.order.grandTotal }).from(schema.order).where(eq(schema.order.id, orderId));
  if (!o) return 0;
  const [r] = await tx
    .select({ sum: sql<number>`coalesce(sum(${schema.refund.amount}), 0)::int` })
    .from(schema.refund)
    .where(and(eq(schema.refund.orderId, orderId), inArray(schema.refund.status, ["pending", "processed"])));
  return Math.max(0, o.grandTotal - (r?.sum ?? 0));
}

export type RefundResult = { ok: true; refundId: string; providerRefundId: string } | { ok: false; message: string };

/**
 * Issues a refund through the payment provider. The refund row is created
 * (and the refundable balance checked) under a row lock BEFORE calling the
 * provider, so double-submits cannot over-refund. The order only becomes
 * "refunded" when the provider confirms (webhook / signed test event).
 */
export async function issueRefund(params: {
  orderId: string;
  amount: number;
  reason: string;
  actor: { id: string; email: string } | null;
}): Promise<RefundResult> {
  const { orderId, amount, reason, actor } = params;
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, message: "Enter a refund amount greater than zero." };

  const prepared = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.order).where(eq(schema.order.id, orderId)).for("update");
    if (!o) return { ok: false as const, message: "Order not found." };
    if (!["paid", "partially_refunded", "refund_pending"].includes(o.paymentStatus)) {
      return { ok: false as const, message: "Only paid orders can be refunded." };
    }
    const [pay] = await tx
      .select()
      .from(schema.payment)
      .where(and(eq(schema.payment.orderId, orderId), eq(schema.payment.status, "captured")));
    if (!pay?.providerPaymentId) return { ok: false as const, message: "No captured payment found for this order." };
    const available = await refundableAmount(orderId, tx);
    if (amount > available) return { ok: false as const, message: `The most that can be refunded is ${(available / 100).toFixed(2)} INR.` };

    const [r] = await tx
      .insert(schema.refund)
      .values({ orderId, paymentId: pay.id, amount, reason: reason.slice(0, 500), status: "pending", actorUserId: actor?.id ?? null })
      .returning({ id: schema.refund.id });
    await tx.update(schema.order).set({ paymentStatus: "refund_pending" }).where(eq(schema.order.id, orderId));
    await tx.insert(schema.orderEvent).values({
      orderId,
      type: "refund.requested",
      message: `Refund of ${(amount / 100).toFixed(2)} INR requested. Reason: ${reason.slice(0, 200)}`,
      actorUserId: actor?.id ?? null,
    });
    await audit(actor, "order.refund_requested", "order", orderId, { amount, refundId: r.id }, tx);
    return { ok: true as const, refundId: r.id, provider: pay.provider, providerPaymentId: pay.providerPaymentId, orderNumber: o.orderNumber };
  });
  if (!prepared.ok) return prepared;

  const provider = providerById(prepared.provider);
  try {
    if (!provider) throw new Error(`Payment provider "${prepared.provider}" is not available in this environment.`);
    const res = await provider.refund({
      providerPaymentId: prepared.providerPaymentId,
      amount,
      notes: { order_number: prepared.orderNumber, refund_id: prepared.refundId },
    });
    await db.transaction(async (tx) => {
      await tx
        .update(schema.refund)
        .set({ providerRefundId: res.providerRefundId, status: res.status === "processed" ? "processed" : "pending" })
        .where(eq(schema.refund.id, prepared.refundId));
      await recomputeRefundState(tx, orderId);
    });
    return { ok: true, refundId: prepared.refundId, providerRefundId: res.providerRefundId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refund failed";
    await db.transaction(async (tx) => {
      await tx.update(schema.refund).set({ status: "failed" }).where(eq(schema.refund.id, prepared.refundId));
      await tx.insert(schema.orderEvent).values({ orderId, type: "refund.failed", message: `Refund could not be created: ${message}` });
      await recomputeRefundState(tx, orderId);
    });
    return { ok: false, message: `The payment provider rejected the refund: ${message}` };
  }
}
