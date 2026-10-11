import "server-only";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { hmacSha256Hex, safeEqual, sha256 } from "@/server/crypto";
import { getSettings } from "@/server/settings";
import { env } from "@/server/env";
import { activeProvider } from "@/server/payments";
import { customerHasUsedDiscount, loadCartLines, loadDiscountRule, toPricingLines } from "@/server/cart";
import { computeTotals, discountMessages, evaluateDiscount } from "@/server/domain/pricing";
import { decrementStock, InsufficientStockError } from "./inventory";
import { normaliseIndianMobile } from "@/lib/india";
import type { CheckoutInput } from "@/lib/validation";

export type CreateOrderResult =
  | { ok: true; orderId: string; orderNumber: string; accessToken: string }
  | { ok: false; code: "empty" | "review_bag" | "total_changed" | "discount" | "stock" | "shipping"; message: string };

export function formatOrderNumber(seq: number, year = new Date().getFullYear()): string {
  return `BS-${year}-${String(seq).padStart(6, "0")}`;
}

/**
 * Converts the cart into an order inside one transaction:
 *   validate lines → recompute totals server-side → reserve discount usage →
 *   decrement stock (conditional, cannot oversell) → write order + items.
 * The cart is emptied only after the transaction commits.
 *
 * Idempotent: a repeated submission with the same checkoutKey returns the
 * existing order instead of creating a second one.
 */
export async function createOrderFromCart(params: {
  cartId: string;
  input: CheckoutInput;
  userId: string | null;
}): Promise<CreateOrderResult> {
  const { cartId, input, userId } = params;
  const settings = await getSettings();
  const method = settings.shipping.methods.find((m) => m.id === input.shippingMethodId);
  if (!method) return { ok: false, code: "shipping", message: "Please choose a delivery option." };
  if (!settings.shipping.countries.includes(input.address.country)) {
    return { ok: false, code: "shipping", message: "We don't currently deliver to this country." };
  }

  const existing = await db
    .select({ id: schema.order.id, orderNumber: schema.order.orderNumber })
    .from(schema.order)
    .where(eq(schema.order.checkoutKey, input.checkoutKey));
  if (existing[0]) {
    // Same submission replayed (double click / network retry): return the existing order.
    const token = await currentOrderAccessToken(existing[0].id);
    return { ok: true, orderId: existing[0].id, orderNumber: existing[0].orderNumber, accessToken: token };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const lines = await loadCartLines(cartId, tx);
      if (lines.length === 0) return { ok: false, code: "empty", message: "Your bag is empty." } as const;
      if (lines.some((l) => l.purchasableQuantity !== l.quantity)) {
        return { ok: false, code: "review_bag", message: "Some items in your bag have changed availability. Please review your bag." } as const;
      }
      const pricingLines = toPricingLines(lines);

      let discountAmount = 0;
      let discountId: string | null = null;
      let discountCode: string | null = null;
      const [cartRow] = await tx.select().from(schema.cart).where(eq(schema.cart.id, cartId));
      if (cartRow?.discountCode) {
        const rule = await loadDiscountRule(cartRow.discountCode, tx);
        if (!rule) return { ok: false, code: "discount", message: "Your discount code is no longer valid. Please remove it and try again." } as const;
        const used = rule.oncePerCustomer ? await customerHasUsedDiscount(rule.id, { userId, email: input.email }, tx) : false;
        const evaluation = evaluateDiscount(rule, pricingLines, new Date(), { customerHasUsed: used });
        if (!evaluation.ok) return { ok: false, code: "discount", message: discountMessages[evaluation.reason] } as const;
        // Reserve one use atomically; released again if the order expires or is cancelled unpaid.
        const reserved = await tx
          .update(schema.discount)
          .set({ usageCount: sql`${schema.discount.usageCount} + 1` })
          .where(
            and(
              eq(schema.discount.id, rule.id),
              or(isNull(schema.discount.usageLimit), lt(schema.discount.usageCount, schema.discount.usageLimit)),
            ),
          )
          .returning({ id: schema.discount.id });
        if (reserved.length === 0) return { ok: false, code: "discount", message: discountMessages.usage_limit } as const;
        discountAmount = evaluation.amount;
        discountId = rule.id;
        discountCode = rule.code;
      }

      const totals = computeTotals({ lines: pricingLines, discount: discountAmount, shipping: method, tax: settings.tax });
      if (totals.grandTotal !== input.expectedTotal) {
        return { ok: false, code: "total_changed", message: "Your order total has changed since you opened checkout. Please review the updated total." } as const;
      }

      for (const line of lines) await decrementStock(tx, line.variantId, line.quantity, line.sku);

      const seqResult = await tx.execute<{ n: string }>(sql`SELECT nextval('order_number_seq')::text AS n`);
      const orderNumber = formatOrderNumber(Number(seqResult.rows[0].n));
      const reservedUntil = new Date(Date.now() + settings.checkout.reservationMinutes * 60_000);

      const [created] = await tx
        .insert(schema.order)
        .values({
          orderNumber,
          userId,
          email: input.email,
          phone: normaliseIndianMobile(input.address.phone),
          shippingAddress: { ...input.address, phone: normaliseIndianMobile(input.address.phone) },
          shippingMethod: method.label,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          shippingTotal: totals.shippingTotal,
          taxTotal: totals.taxTotal,
          taxInclusive: totals.taxInclusive,
          grandTotal: totals.grandTotal,
          currency: "INR",
          discountCode,
          discountId,
          reservedUntil,
          stockReserved: true,
          checkoutKey: input.checkoutKey,
          customerNote: input.customerNote,
          isTest: env.PAYMENT_PROVIDER === "test",
        })
        .returning({ id: schema.order.id });

      await tx.insert(schema.orderItem).values(
        lines.map((l) => ({
          orderId: created.id,
          productId: l.productId,
          variantId: l.variantId,
          productName: l.productName,
          productSlug: l.productSlug,
          variantLabel: [l.colourName, l.size ? `Size ${l.size}` : null].filter(Boolean).join(" · ") || null,
          sku: l.sku,
          imageUrl: l.image?.url ?? null,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          lineTotal: l.unitPrice * l.quantity,
        })),
      );
      await tx.insert(schema.orderEvent).values({
        orderId: created.id,
        type: "order.created",
        message: `Order placed; stock held until ${reservedUntil.toISOString()} pending payment.`,
        customerVisible: false,
      });

      if (input.saveAddress && userId) {
        const [{ n }] = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(schema.address)
          .where(eq(schema.address.userId, userId));
        await tx.insert(schema.address).values({ userId, ...input.address, phone: normaliseIndianMobile(input.address.phone), isDefault: n === 0 });
      }

      // Cart is converted into the order.
      await tx.delete(schema.cartItem).where(eq(schema.cartItem.cartId, cartId));
      await tx.update(schema.cart).set({ discountCode: null }).where(eq(schema.cart.id, cartId));

      return { ok: true, orderId: created.id, orderNumber, accessToken: orderAccessToken(created.id, 1) } as const;
    });
    return result;
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return { ok: false, code: "stock", message: "Part of your order has just sold out. Please review your bag." };
    }
    // Unique violation on checkout_key: a concurrent duplicate submission won the race.
    if (typeof err === "object" && err && "code" in err && (err as { code: string }).code === "23505") {
      const [o] = await db.select().from(schema.order).where(eq(schema.order.checkoutKey, input.checkoutKey));
      if (o) return { ok: true, orderId: o.id, orderNumber: o.orderNumber, accessToken: orderAccessToken(o.id, o.accessVersion) };
    }
    throw err;
  }
}

/**
 * Returns the provider payment for an unpaid order, creating it on first use
 * (outside the order transaction so no DB locks are held during the API call).
 */
export async function getOrCreatePayment(orderId: string) {
  const provider = activeProvider();
  const [o] = await db.select().from(schema.order).where(eq(schema.order.id, orderId));
  if (!o) throw new Error("Order not found");
  if (o.status !== "pending_payment") return null;

  const [existing] = await db
    .select()
    .from(schema.payment)
    .where(and(eq(schema.payment.orderId, orderId), eq(schema.payment.provider, provider.id), eq(schema.payment.amount, o.grandTotal)));
  if (existing && existing.status !== "captured") {
    return { payment: existing, client: provider.clientConfig(existing) };
  }

  const { providerOrderId } = await provider.createPaymentOrder({
    orderId: o.id,
    orderNumber: o.orderNumber,
    amount: o.grandTotal,
    currency: o.currency,
  });
  const [created] = await db
    .insert(schema.payment)
    .values({ orderId: o.id, provider: provider.id, providerOrderId, amount: o.grandTotal, currency: o.currency })
    .returning();
  return { payment: created, client: provider.clientConfig(created) };
}

/**
 * Guest order links carry an HMAC of (orderId, version). Nothing secret is
 * stored; bumping `access_version` revokes every earlier link.
 */
export function orderAccessToken(orderId: string, version: number): string {
  const key = sha256(`order-access:${env.BETTER_AUTH_SECRET}`);
  return Buffer.from(hmacSha256Hex(key, `${orderId}:${version}`), "hex").toString("base64url");
}

export async function currentOrderAccessToken(orderId: string): Promise<string> {
  const [o] = await db.select({ v: schema.order.accessVersion }).from(schema.order).where(eq(schema.order.id, orderId));
  return orderAccessToken(orderId, o?.v ?? 1);
}

export async function findOrderByAccessToken(orderId: string, token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !token || token.length > 100) return null;
  const [o] = await db.select().from(schema.order).where(eq(schema.order.id, orderId));
  if (!o) return null;
  return safeEqual(orderAccessToken(o.id, o.accessVersion), token) ? o : null;
}
