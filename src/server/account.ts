import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";

/** A customer's orders. Abandoned/expired checkouts are hidden to avoid confusion. */
export async function customerOrders(userId: string, opts: { limit: number; offset?: number }) {
  const where = and(eq(schema.order.userId, userId), inArray(schema.order.status, ["confirmed", "cancelled", "pending_payment"]));
  const [rows, [count]] = await Promise.all([
    db
      .select({
        orderNumber: schema.order.orderNumber,
        createdAt: schema.order.createdAt,
        grandTotal: schema.order.grandTotal,
        status: schema.order.status,
        paymentStatus: schema.order.paymentStatus,
        fulfillmentStatus: schema.order.fulfillmentStatus,
        itemCount: sql<number>`(SELECT coalesce(sum(oi.quantity), 0)::int FROM "order_item" oi WHERE oi.order_id = "order"."id")`,
      })
      .from(schema.order)
      .where(where)
      .orderBy(desc(schema.order.createdAt))
      .limit(opts.limit)
      .offset(opts.offset ?? 0),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.order).where(where),
  ]);
  return { rows, total: count?.n ?? 0 };
}

export async function customerOrderByNumber(userId: string, orderNumber: string) {
  const [o] = await db
    .select()
    .from(schema.order)
    .where(and(eq(schema.order.userId, userId), eq(schema.order.orderNumber, orderNumber)));
  return o ?? null;
}

export async function customerAddresses(userId: string) {
  return db.select().from(schema.address).where(eq(schema.address.userId, userId)).orderBy(desc(schema.address.isDefault), desc(schema.address.createdAt));
}
