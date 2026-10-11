import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { schema, type Tx } from "@/server/db";

export class InsufficientStockError extends Error {
  constructor(public readonly sku: string) {
    super(`Insufficient stock for ${sku}`);
    this.name = "InsufficientStockError";
  }
}

/**
 * Atomically decrements stock. The conditional WHERE makes overselling
 * impossible even under concurrent checkouts: a row is only updated when it
 * still has enough units, and the CHECK constraint (stock >= 0) is a backstop.
 */
export async function decrementStock(tx: Tx, variantId: string, quantity: number, sku: string) {
  const updated = await tx
    .update(schema.productVariant)
    .set({ stockOnHand: sql`${schema.productVariant.stockOnHand} - ${quantity}` })
    .where(
      and(
        eq(schema.productVariant.id, variantId),
        eq(schema.productVariant.isActive, true),
        gte(schema.productVariant.stockOnHand, quantity),
      ),
    )
    .returning({ id: schema.productVariant.id });
  if (updated.length === 0) throw new InsufficientStockError(sku);
}

export async function incrementStock(tx: Tx, variantId: string, quantity: number) {
  await tx
    .update(schema.productVariant)
    .set({ stockOnHand: sql`${schema.productVariant.stockOnHand} + ${quantity}` })
    .where(eq(schema.productVariant.id, variantId));
}

/**
 * Returns an order's held stock and discount usage. Guarded by the
 * `stock_reserved` flag so it can never run twice for the same order.
 */
export async function releaseReservation(tx: Tx, orderId: string): Promise<boolean> {
  const [o] = await tx
    .update(schema.order)
    .set({ stockReserved: false })
    .where(and(eq(schema.order.id, orderId), eq(schema.order.stockReserved, true)))
    .returning({ id: schema.order.id, discountId: schema.order.discountId });
  if (!o) return false;
  const items = await tx.select().from(schema.orderItem).where(eq(schema.orderItem.orderId, orderId));
  for (const item of items) {
    if (item.variantId) await incrementStock(tx, item.variantId, item.quantity);
  }
  if (o.discountId) {
    await tx
      .update(schema.discount)
      .set({ usageCount: sql`greatest(${schema.discount.usageCount} - 1, 0)` })
      .where(eq(schema.discount.id, o.discountId));
  }
  return true;
}

/** Re-acquires stock for an order whose reservation lapsed (late payment). All-or-nothing. */
export async function reacquireReservation(tx: Tx, orderId: string): Promise<boolean> {
  const items = await tx.select().from(schema.orderItem).where(eq(schema.orderItem.orderId, orderId));
  try {
    await tx.transaction(async (sp) => {
      for (const item of items) {
        if (!item.variantId) throw new InsufficientStockError(item.sku);
        await decrementStock(sp, item.variantId, item.quantity, item.sku);
      }
    });
  } catch (e) {
    if (e instanceof InsufficientStockError) return false;
    throw e;
  }
  await tx.update(schema.order).set({ stockReserved: true }).where(eq(schema.order.id, orderId));
  return true;
}
