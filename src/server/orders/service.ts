import "server-only";
import { and, asc, eq, lt, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { env } from "@/server/env";
import { randomToken } from "@/server/crypto";
import { currentOrderAccessToken, orderAccessToken } from "./checkout";
import { emails, sendEmail } from "@/server/email";
import { audit } from "@/server/audit";
import { formatMoney } from "@/lib/money";
import { providerById } from "@/server/payments";
import { fetchPayment, paymentToEvent, verifyCheckoutSignature } from "@/server/payments/razorpay";
import { signTestEvent, TEST_SIGNATURE_HEADER, type TestEventBody } from "@/server/payments/test-provider";
import type { ProviderId } from "@/server/payments/types";
import {
  canCancelOrder,
  canTransitionFulfillment,
  fulfillmentAllowed,
  type FulfillmentStatus,
} from "@/server/domain/order-state";
import { applyPaymentEvent } from "./payment-events";
import { releaseReservation, incrementStock } from "./inventory";
import { issueRefund, refundableAmount } from "./refunds";

type Actor = { id: string; email: string } | null;

export function orderUrl(orderId: string, token: string) {
  return `${env.APP_URL}/orders/${orderId}?token=${encodeURIComponent(token)}`;
}

/** Issues a new access link, revoking all earlier links to this order. */
export async function rotateOrderAccessLink(orderId: string): Promise<string> {
  const [o] = await db
    .update(schema.order)
    .set({ accessVersion: sql`${schema.order.accessVersion} + 1` })
    .where(eq(schema.order.id, orderId))
    .returning({ v: schema.order.accessVersion });
  return orderUrl(orderId, orderAccessToken(orderId, o.v));
}

/** Link for emails: current (unrotated) token for guests, account page for members. */
async function customerOrderLink(o: { id: string; userId: string | null; orderNumber: string }) {
  if (o.userId) return `${env.APP_URL}/account/orders/${o.orderNumber}`;
  return orderUrl(o.id, await currentOrderAccessToken(o.id));
}

async function afterConfirmed(orderId: string) {
  const [o] = await db.select().from(schema.order).where(eq(schema.order.id, orderId));
  if (!o) return;
  const items = await db.select().from(schema.orderItem).where(eq(schema.orderItem.orderId, orderId)).orderBy(asc(schema.orderItem.productName));
  const url = await customerOrderLink(o);
  await sendEmail({
    to: o.email,
    ...emails.orderConfirmed({
      orderNumber: o.orderNumber,
      total: formatMoney(o.grandTotal),
      url,
      lines: items.map((i) => `• ${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ""} × ${i.quantity} — ${formatMoney(i.lineTotal)}`),
    }),
  });
}

/** Entry point for all provider webhooks (and signed test events). */
export async function handleProviderWebhook(providerId: ProviderId, rawBody: string, headers: Headers) {
  const provider = providerById(providerId);
  if (!provider) return { status: 404 as const, outcome: "provider_unavailable" };
  let event;
  try {
    event = provider.parseWebhook(rawBody, headers);
  } catch {
    return { status: 400 as const, outcome: "malformed" };
  }
  if (!event) return { status: 401 as const, outcome: "invalid_signature" };
  const result = await applyPaymentEvent(providerId, event);
  if (result.newlyConfirmed && result.orderId) await afterConfirmed(result.orderId);
  return { status: 200 as const, outcome: result.outcome, orderId: result.orderId };
}

/** Razorpay Checkout success callback: verify signature, then fetch authoritative state from the API. */
export async function confirmRazorpayCheckout(input: { razorpayOrderId: string; razorpayPaymentId: string; signature: string }) {
  if (!verifyCheckoutSignature(input.razorpayOrderId, input.razorpayPaymentId, input.signature)) {
    return { ok: false as const, message: "We couldn't verify this payment. If money was deducted, it will be reconciled automatically — please contact us." };
  }
  const payment = await fetchPayment(input.razorpayPaymentId);
  if (payment.order_id !== input.razorpayOrderId) return { ok: false as const, message: "Payment does not match this order." };
  const result = await applyPaymentEvent("razorpay", paymentToEvent(payment, { source: "checkout_callback", id: payment.id, status: payment.status }));
  if (result.newlyConfirmed && result.orderId) await afterConfirmed(result.orderId);
  return { ok: true as const, outcome: result.outcome };
}

/** TEST adapter only: emits a signed event through the exact webhook path. */
export async function simulateTestPayment(orderId: string, outcome: "success" | "failure") {
  if (env.APP_ENV === "production" || env.PAYMENT_PROVIDER !== "test") throw new Error("Test payments are disabled.");
  const [pay] = await db
    .select()
    .from(schema.payment)
    .where(and(eq(schema.payment.orderId, orderId), eq(schema.payment.provider, "test")))
    .orderBy(sql`${schema.payment.createdAt} DESC`)
    .limit(1);
  if (!pay) throw new Error("No test payment session for this order.");
  const body: TestEventBody = {
    event: outcome === "success" ? "payment.captured" : "payment.failed",
    providerOrderId: pay.providerOrderId,
    providerPaymentId: `test_pay_${randomToken(10)}`,
    amount: pay.amount,
    currency: pay.currency,
    reason: outcome === "failure" ? "Simulated decline (test mode)" : undefined,
  };
  const raw = JSON.stringify(body);
  return handleProviderWebhook("test", raw, new Headers({ [TEST_SIGNATURE_HEADER]: signTestEvent(raw) }));
}

async function settleTestRefundIfNeeded(orderId: string, providerRefundId: string) {
  if (env.PAYMENT_PROVIDER !== "test" || env.APP_ENV === "production") return;
  const [r] = await db
    .select({ amount: schema.refund.amount, providerPaymentId: schema.payment.providerPaymentId })
    .from(schema.refund)
    .innerJoin(schema.payment, eq(schema.payment.id, schema.refund.paymentId))
    .where(and(eq(schema.refund.orderId, orderId), eq(schema.refund.providerRefundId, providerRefundId)));
  if (!r?.providerPaymentId) return;
  const raw = JSON.stringify({ event: "refund.processed", providerPaymentId: r.providerPaymentId, providerRefundId, amount: r.amount } satisfies TestEventBody);
  await handleProviderWebhook("test", raw, new Headers({ [TEST_SIGNATURE_HEADER]: signTestEvent(raw) }));
}

/** Admin: partial or full refund without cancelling the order. */
export async function refundOrder(orderId: string, amount: number, reason: string, actor: Actor) {
  const res = await issueRefund({ orderId, amount, reason, actor });
  if (res.ok) await settleTestRefundIfNeeded(orderId, res.providerRefundId);
  return res;
}

/** Admin: move fulfilment forward/back along valid transitions only. */
export async function updateFulfillment(
  orderId: string,
  to: FulfillmentStatus,
  actor: Actor,
  tracking?: { carrier?: string | null; number?: string | null; url?: string | null },
) {
  const result = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.order).where(eq(schema.order.id, orderId)).for("update");
    if (!o) return { ok: false as const, message: "Order not found." };
    if (!fulfillmentAllowed(o)) return { ok: false as const, message: "Only confirmed, paid orders can be fulfilled." };
    if (to === "cancelled") return { ok: false as const, message: "Use “Cancel order” to cancel." };
    if (!canTransitionFulfillment(o.fulfillmentStatus, to)) {
      return { ok: false as const, message: `Can't move an order from “${o.fulfillmentStatus}” to “${to}”.` };
    }
    const trackingUrl = tracking?.url && /^https:\/\//.test(tracking.url) ? tracking.url : null;
    await tx
      .update(schema.order)
      .set({
        fulfillmentStatus: to,
        ...(to === "shipped"
          ? { trackingCarrier: tracking?.carrier || null, trackingNumber: tracking?.number || null, trackingUrl }
          : {}),
      })
      .where(eq(schema.order.id, orderId));
    const visible = to === "shipped" || to === "delivered" || to === "processing";
    const labels: Record<string, string> = {
      processing: "Your order is being prepared.",
      packed: "Order packed.",
      shipped: "Your order has shipped.",
      delivered: "Your order has been delivered.",
      unfulfilled: "Order returned to the preparation queue.",
    };
    await tx.insert(schema.orderEvent).values({ orderId, type: `fulfillment.${to}`, message: labels[to] ?? to, actorUserId: actor?.id ?? null, customerVisible: visible });
    await audit(actor, "order.fulfillment_updated", "order", orderId, { from: o.fulfillmentStatus, to }, tx);
    return { ok: true as const, order: o };
  });
  if (result.ok && to === "shipped") {
    const o = result.order;
    const url = await customerOrderLink(o);
    await sendEmail({ to: o.email, ...emails.orderShipped({ orderNumber: o.orderNumber, url, carrier: tracking?.carrier, tracking: tracking?.number }) });
  }
  return result.ok ? { ok: true as const } : result;
}

/**
 * Admin: cancel an order. Unpaid orders release their reservation. Paid,
 * unshipped orders are restocked and fully refunded through the provider.
 */
export async function cancelOrder(orderId: string, reason: string, actor: Actor) {
  const prepared = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.order).where(eq(schema.order.id, orderId)).for("update");
    if (!o) return { ok: false as const, message: "Order not found." };
    if (!canCancelOrder(o)) return { ok: false as const, message: "This order can no longer be cancelled (it has shipped or is already closed)." };

    if (o.status === "pending_payment" || o.status === "expired") {
      await releaseReservation(tx, o.id);
    } else if (o.stockReserved) {
      // Paid & unshipped: stock was consumed by this order — put it back.
      const items = await tx.select().from(schema.orderItem).where(eq(schema.orderItem.orderId, o.id));
      for (const i of items) if (i.variantId) await incrementStock(tx, i.variantId, i.quantity);
      await tx.update(schema.order).set({ stockReserved: false }).where(eq(schema.order.id, o.id));
    }
    await tx
      .update(schema.order)
      .set({ status: "cancelled", fulfillmentStatus: "cancelled", cancelledAt: new Date(), reservedUntil: null })
      .where(eq(schema.order.id, o.id));
    await tx.insert(schema.orderEvent).values({ orderId, type: "order.cancelled", message: `Order cancelled. ${reason}`.trim(), actorUserId: actor?.id ?? null, customerVisible: true });
    await audit(actor, "order.cancelled", "order", orderId, { reason: reason.slice(0, 200), wasPaid: o.paymentStatus === "paid" }, tx);
    return { ok: true as const, order: o };
  });
  if (!prepared.ok) return prepared;

  let refundNote: string | null = null;
  const o = prepared.order;
  if (["paid", "partially_refunded"].includes(o.paymentStatus)) {
    const amount = await refundableAmount(o.id);
    if (amount > 0) {
      const res = await refundOrder(o.id, amount, `Order cancelled: ${reason}`.slice(0, 500), actor);
      refundNote = res.ok
        ? `A refund of ${formatMoney(amount)} has been issued to your original payment method. Your bank may take a few working days to show it.`
        : null;
      if (!res.ok) {
        await db.update(schema.order).set({ needsAttention: true }).where(eq(schema.order.id, o.id));
        return { ok: true as const, warning: res.message };
      }
    }
  }
  if (o.status === "confirmed") {
    const url = await customerOrderLink(o);
    await sendEmail({ to: o.email, ...emails.orderCancelled({ orderNumber: o.orderNumber, url, refundNote }) });
  }
  return { ok: true as const };
}

/** Customer: abandon an unpaid order and put its items back in the bag. */
export async function abandonPendingOrder(orderId: string, cartId: string) {
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.order).where(eq(schema.order.id, orderId)).for("update");
    if (!o || o.status !== "pending_payment") return false;
    // If any payment is mid-flight (authorized/captured), don't cancel underneath it.
    const [inflight] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.payment)
      .where(and(eq(schema.payment.orderId, orderId), sql`${schema.payment.status} IN ('authorized','captured')`));
    if ((inflight?.n ?? 0) > 0) return false;
    await releaseReservation(tx, o.id);
    await tx.update(schema.order).set({ status: "cancelled", fulfillmentStatus: "cancelled", cancelledAt: new Date() }).where(eq(schema.order.id, o.id));
    await tx.insert(schema.orderEvent).values({ orderId, type: "order.abandoned", message: "Customer returned to their bag before paying; reservation released." });
    const items = await tx.select().from(schema.orderItem).where(eq(schema.orderItem.orderId, o.id));
    for (const i of items) {
      if (!i.variantId) continue;
      await tx
        .insert(schema.cartItem)
        .values({ cartId, variantId: i.variantId, quantity: i.quantity, priceAtAdd: i.unitPrice })
        .onConflictDoUpdate({ target: [schema.cartItem.cartId, schema.cartItem.variantId], set: { quantity: i.quantity } });
    }
    if (o.discountCode) await tx.update(schema.cart).set({ discountCode: o.discountCode }).where(eq(schema.cart.id, cartId));
    return true;
  });
}

/** Expires unpaid orders whose reservation lapsed and returns their stock. */
export async function expireStaleOrders(now = new Date()): Promise<number> {
  const stale = await db
    .select({ id: schema.order.id })
    .from(schema.order)
    .where(and(eq(schema.order.status, "pending_payment"), lt(schema.order.reservedUntil, now)))
    .limit(200);
  let count = 0;
  for (const { id } of stale) {
    const done = await db.transaction(async (tx) => {
      const [o] = await tx.select().from(schema.order).where(eq(schema.order.id, id)).for("update");
      if (!o || o.status !== "pending_payment" || !o.reservedUntil || o.reservedUntil >= now) return false;
      await releaseReservation(tx, id);
      await tx.update(schema.order).set({ status: "expired" }).where(eq(schema.order.id, id));
      await tx.insert(schema.orderEvent).values({ orderId: id, type: "order.expired", message: "Payment not completed in time; reserved stock released." });
      return true;
    });
    if (done) count++;
  }
  return count;
}

/** Guest order lookup: if order number + email match, email a fresh secure link. Always responds the same. */
export async function requestGuestOrderLink(orderNumber: string, email: string) {
  const [o] = await db
    .select({ id: schema.order.id, email: schema.order.email, orderNumber: schema.order.orderNumber })
    .from(schema.order)
    .where(and(eq(schema.order.orderNumber, orderNumber.trim().toUpperCase()), sql`lower(${schema.order.email}) = lower(${email.trim()})`));
  if (!o) return;
  const url = await rotateOrderAccessLink(o.id);
  await sendEmail({ to: o.email, ...emails.orderLink({ orderNumber: o.orderNumber, url }) });
}
