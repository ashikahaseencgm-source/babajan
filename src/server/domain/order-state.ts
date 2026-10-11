/**
 * Order state machine. Payment and fulfilment are tracked separately:
 *
 *   status:            pending_payment → confirmed | cancelled | expired
 *   paymentStatus:     pending → paid | failed;  paid → refund_pending → partially_refunded | refunded
 *   fulfillmentStatus: unfulfilled → processing → packed → shipped → delivered  (or → cancelled before shipping)
 *
 * Every transition is validated here; the service layer applies it with a
 * conditional UPDATE (WHERE current_state = expected) so concurrent requests
 * cannot both succeed.
 */

export type OrderStatus = "pending_payment" | "confirmed" | "cancelled" | "expired";
export type PaymentStatus = "pending" | "paid" | "failed" | "refund_pending" | "partially_refunded" | "refunded";
export type FulfillmentStatus = "unfulfilled" | "processing" | "packed" | "shipped" | "delivered" | "cancelled";

const fulfillmentGraph: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  unfulfilled: ["processing", "cancelled"],
  processing: ["packed", "unfulfilled", "cancelled"],
  packed: ["shipped", "processing", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const paymentGraph: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["paid", "failed"],
  // A failed attempt can still be followed by a successful retry.
  failed: ["paid", "failed"],
  paid: ["refund_pending", "partially_refunded", "refunded"],
  refund_pending: ["partially_refunded", "refunded", "paid"],
  partially_refunded: ["refund_pending", "partially_refunded", "refunded"],
  refunded: [],
};

const orderGraph: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["confirmed", "cancelled", "expired"],
  // Expired orders can be revived by a late, verified payment if stock can be re-reserved.
  expired: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  cancelled: [],
};

export function canTransitionFulfillment(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  return fulfillmentGraph[from].includes(to);
}

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return paymentGraph[from].includes(to);
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return orderGraph[from].includes(to);
}

/** Fulfilment moves are only meaningful once the order is confirmed and paid. */
export function fulfillmentAllowed(order: { status: OrderStatus; paymentStatus: PaymentStatus }): boolean {
  return order.status === "confirmed" && (order.paymentStatus === "paid" || order.paymentStatus === "partially_refunded");
}

export function nextFulfillmentOptions(order: {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
}): FulfillmentStatus[] {
  if (!fulfillmentAllowed(order)) return [];
  // Cancelling a paid order goes through the dedicated cancel flow (which handles refunds).
  return fulfillmentGraph[order.fulfillmentStatus].filter((s) => s !== "cancelled");
}

/** A paid order may be cancelled until it has shipped. */
export function canCancelOrder(order: { status: OrderStatus; fulfillmentStatus: FulfillmentStatus }): boolean {
  if (order.status === "pending_payment" || order.status === "expired") return true;
  if (order.status !== "confirmed") return false;
  return ["unfulfilled", "processing", "packed"].includes(order.fulfillmentStatus);
}

export const fulfillmentLabels: Record<FulfillmentStatus, string> = {
  unfulfilled: "Awaiting preparation",
  processing: "Being prepared",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const paymentLabels: Record<PaymentStatus, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  failed: "Payment failed",
  refund_pending: "Refund in progress",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  expired: "Expired (unpaid)",
};

/** Customer-facing single-line summary. */
export function customerStatusLabel(order: {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
}): string {
  if (order.status === "pending_payment") return order.paymentStatus === "failed" ? "Payment unsuccessful" : "Awaiting payment";
  if (order.status === "expired") return "Not completed";
  if (order.status === "cancelled") {
    if (order.paymentStatus === "refunded") return "Cancelled · Refunded";
    if (order.paymentStatus === "refund_pending") return "Cancelled · Refund in progress";
    return "Cancelled";
  }
  if (order.paymentStatus === "refunded") return "Refunded";
  return fulfillmentLabels[order.fulfillmentStatus];
}
