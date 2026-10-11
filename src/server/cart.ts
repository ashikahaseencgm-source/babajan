import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db, schema, type DbOrTx } from "@/server/db";
import { env } from "@/server/env";
import { getCurrentUser } from "@/server/session";
import { getSettings } from "@/server/settings";
import {
  computeTotals,
  discountMessages,
  effectiveUnitPrice,
  evaluateDiscount,
  MAX_QTY_PER_LINE,
  type DiscountRule,
  type PricingLine,
  type Totals,
} from "@/server/domain/pricing";

const CART_COOKIE = "bs_cart";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CartLineIssue = "unavailable" | "out_of_stock" | "quantity_reduced" | "price_changed";

export type CartLine = {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  department: "women" | "men" | "unisex";
  size: string | null;
  colourName: string | null;
  colourHex: string | null;
  sku: string;
  image: { url: string; alt: string } | null;
  quantity: number;
  /** Quantity that can actually be purchased right now. */
  purchasableQuantity: number;
  unitPrice: number;
  previousUnitPrice: number;
  lineTotal: number;
  stockOnHand: number;
  collectionIds: string[];
  issues: CartLineIssue[];
};

export type CartView = {
  id: string | null;
  lines: CartLine[];
  itemCount: number;
  discount: { code: string; ok: true; amount: number } | { code: string; ok: false; message: string } | null;
  totals: Totals;
  shippingMethod: { id: string; label: string; estimate: string | null } | null;
  hasBlockingIssues: boolean;
  currency: "INR";
};

async function readCartCookie(): Promise<string | null> {
  const value = (await cookies()).get(CART_COOKIE)?.value;
  return value && UUID_RE.test(value) ? value : null;
}

async function writeCartCookie(id: string) {
  (await cookies()).set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.APP_URL.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}

export async function clearCartCookie() {
  (await cookies()).delete(CART_COOKIE);
}

/** Resolve the current cart id without creating one (safe in Server Components). */
export const resolveCartId = cache(async (): Promise<string | null> => {
  const fromCookie = await readCartCookie();
  const user = await getCurrentUser();
  if (fromCookie) {
    const [c] = await db.select({ id: schema.cart.id, userId: schema.cart.userId }).from(schema.cart).where(eq(schema.cart.id, fromCookie));
    // A cart owned by another account is never exposed.
    if (c && (!c.userId || c.userId === user?.id)) return c.id;
  }
  if (user) {
    const [c] = await db
      .select({ id: schema.cart.id })
      .from(schema.cart)
      .where(eq(schema.cart.userId, user.id))
      .orderBy(desc(schema.cart.updatedAt))
      .limit(1);
    if (c) return c.id;
  }
  return null;
});

/** Get or create a cart (only from Server Actions / Route Handlers — writes a cookie). */
export async function ensureCart(): Promise<string> {
  const existing = await resolveCartId();
  const user = await getCurrentUser();
  if (existing) {
    if (user) await db.update(schema.cart).set({ userId: user.id }).where(and(eq(schema.cart.id, existing), sql`${schema.cart.userId} IS NULL`));
    await writeCartCookie(existing);
    return existing;
  }
  const [created] = await db.insert(schema.cart).values({ userId: user?.id ?? null }).returning({ id: schema.cart.id });
  await writeCartCookie(created.id);
  return created.id;
}

/** After sign-in: merge the anonymous cookie cart into the user's cart. */
export async function mergeGuestCartIntoUser(userId: string) {
  const guestId = await readCartCookie();
  const [userCart] = await db
    .select({ id: schema.cart.id })
    .from(schema.cart)
    .where(eq(schema.cart.userId, userId))
    .orderBy(desc(schema.cart.updatedAt))
    .limit(1);

  if (!guestId) {
    if (userCart) await writeCartCookie(userCart.id);
    return;
  }
  const [guest] = await db.select().from(schema.cart).where(eq(schema.cart.id, guestId));
  if (!guest || (guest.userId && guest.userId !== userId)) {
    if (userCart) await writeCartCookie(userCart.id);
    else await clearCartCookie();
    return;
  }
  if (!userCart || userCart.id === guest.id) {
    await db.update(schema.cart).set({ userId }).where(eq(schema.cart.id, guest.id));
    await writeCartCookie(guest.id);
    return;
  }
  await db.transaction(async (tx) => {
    const items = await tx.select().from(schema.cartItem).where(eq(schema.cartItem.cartId, guest.id));
    for (const item of items) {
      await tx
        .insert(schema.cartItem)
        .values({ cartId: userCart.id, variantId: item.variantId, quantity: item.quantity, priceAtAdd: item.priceAtAdd })
        .onConflictDoUpdate({
          target: [schema.cartItem.cartId, schema.cartItem.variantId],
          set: { quantity: sql`least(${schema.cartItem.quantity} + ${item.quantity}, ${MAX_QTY_PER_LINE})`, updatedAt: new Date() },
        });
    }
    if (guest.discountCode) await tx.update(schema.cart).set({ discountCode: guest.discountCode }).where(eq(schema.cart.id, userCart.id));
    await tx.delete(schema.cart).where(eq(schema.cart.id, guest.id));
  });
  await writeCartCookie(userCart.id);
}

async function loadVariantForPurchase(variantId: string, tx: DbOrTx = db) {
  const [row] = await tx
    .select({
      variantId: schema.productVariant.id,
      isActive: schema.productVariant.isActive,
      stockOnHand: schema.productVariant.stockOnHand,
      priceOverride: schema.productVariant.priceOverride,
      productPrice: schema.product.price,
      productStatus: schema.product.status,
    })
    .from(schema.productVariant)
    .innerJoin(schema.product, eq(schema.product.id, schema.productVariant.productId))
    .where(eq(schema.productVariant.id, variantId));
  return row ?? null;
}

export type CartMutationResult = { ok: true; message?: string } | { ok: false; message: string };

export async function addToCart(variantId: string, quantity: number): Promise<CartMutationResult> {
  if (!UUID_RE.test(variantId)) return { ok: false, message: "Please choose a size." };
  const qty = Math.floor(quantity);
  if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) return { ok: false, message: "Please choose a valid quantity." };

  const variant = await loadVariantForPurchase(variantId);
  if (!variant || !variant.isActive || variant.productStatus !== "active") {
    return { ok: false, message: "This item is no longer available." };
  }
  if (variant.stockOnHand <= 0) return { ok: false, message: "This size is currently unavailable." };

  const cartId = await ensureCart();
  const unitPrice = effectiveUnitPrice(variant.productPrice, variant.priceOverride);
  const [existing] = await db
    .select({ quantity: schema.cartItem.quantity })
    .from(schema.cartItem)
    .where(and(eq(schema.cartItem.cartId, cartId), eq(schema.cartItem.variantId, variantId)));
  const desired = (existing?.quantity ?? 0) + qty;
  const allowed = Math.min(desired, variant.stockOnHand, MAX_QTY_PER_LINE);
  if (allowed <= (existing?.quantity ?? 0)) {
    return { ok: false, message: "You already have all available pieces in this size in your bag." };
  }
  await db
    .insert(schema.cartItem)
    .values({ cartId, variantId, quantity: allowed, priceAtAdd: unitPrice })
    .onConflictDoUpdate({
      target: [schema.cartItem.cartId, schema.cartItem.variantId],
      set: { quantity: allowed, priceAtAdd: unitPrice, updatedAt: new Date() },
    });
  await db.update(schema.cart).set({ updatedAt: new Date() }).where(eq(schema.cart.id, cartId));
  return allowed < desired
    ? { ok: true, message: `Only ${allowed} available — we've added what we can.` }
    : { ok: true };
}

export async function setCartQuantity(variantId: string, quantity: number): Promise<CartMutationResult> {
  if (!UUID_RE.test(variantId)) return { ok: false, message: "Item not found." };
  const cartId = await resolveCartId();
  if (!cartId) return { ok: false, message: "Your bag is empty." };
  const qty = Math.floor(quantity);
  if (!Number.isFinite(qty) || qty < 0 || qty > MAX_QTY_PER_LINE) return { ok: false, message: "Please choose a valid quantity." };
  if (qty === 0) return removeFromCart(variantId);

  const variant = await loadVariantForPurchase(variantId);
  if (!variant || !variant.isActive || variant.productStatus !== "active") return { ok: false, message: "This item is no longer available." };
  const allowed = Math.min(qty, variant.stockOnHand);
  if (allowed < 1) return { ok: false, message: "This size is currently unavailable." };
  await db
    .update(schema.cartItem)
    .set({ quantity: allowed, priceAtAdd: effectiveUnitPrice(variant.productPrice, variant.priceOverride), updatedAt: new Date() })
    .where(and(eq(schema.cartItem.cartId, cartId), eq(schema.cartItem.variantId, variantId)));
  return allowed < qty ? { ok: true, message: `Only ${allowed} available in this size.` } : { ok: true };
}

export async function removeFromCart(variantId: string): Promise<CartMutationResult> {
  const cartId = await resolveCartId();
  if (!cartId || !UUID_RE.test(variantId)) return { ok: true };
  await db.delete(schema.cartItem).where(and(eq(schema.cartItem.cartId, cartId), eq(schema.cartItem.variantId, variantId)));
  return { ok: true };
}

export async function setCartDiscountCode(code: string | null): Promise<CartMutationResult> {
  const cartId = code ? await ensureCart() : await resolveCartId();
  if (!cartId) return { ok: true };
  const normalised = code?.trim().toUpperCase() || null;
  if (normalised && !/^[A-Z0-9_-]{2,32}$/.test(normalised)) return { ok: false, message: "Please check this code and try again." };
  if (normalised) {
    const view = await buildCartView(cartId, normalised);
    if (view.discount && !view.discount.ok) return { ok: false, message: view.discount.message };
  }
  await db.update(schema.cart).set({ discountCode: normalised }).where(eq(schema.cart.id, cartId));
  return { ok: true, message: normalised ? "Code applied." : undefined };
}

export async function loadDiscountRule(code: string, tx: DbOrTx = db): Promise<DiscountRule | null> {
  const [d] = await tx.select().from(schema.discount).where(eq(schema.discount.code, code.toUpperCase()));
  return d ?? null;
}

export async function customerHasUsedDiscount(discountId: string, ident: { userId?: string | null; email?: string | null }, tx: DbOrTx = db) {
  if (!ident.userId && !ident.email) return false;
  const [r] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.order)
    .where(
      and(
        eq(schema.order.discountId, discountId),
        inArray(schema.order.status, ["confirmed", "pending_payment"]),
        ident.userId ? eq(schema.order.userId, ident.userId) : sql`lower(${schema.order.email}) = lower(${ident.email!})`,
      ),
    );
  return (r?.n ?? 0) > 0;
}

/** Builds lines from current catalogue data (prices, stock, availability). */
export async function loadCartLines(cartId: string, tx: DbOrTx = db): Promise<CartLine[]> {
  const rows = await tx
    .select({
      variantId: schema.cartItem.variantId,
      quantity: schema.cartItem.quantity,
      priceAtAdd: schema.cartItem.priceAtAdd,
      size: schema.productVariant.size,
      sku: schema.productVariant.sku,
      stockOnHand: schema.productVariant.stockOnHand,
      variantActive: schema.productVariant.isActive,
      priceOverride: schema.productVariant.priceOverride,
      productId: schema.product.id,
      productSlug: schema.product.slug,
      productName: schema.product.name,
      productStatus: schema.product.status,
      productPrice: schema.product.price,
      department: schema.product.department,
      colourName: schema.product.colourName,
      colourHex: schema.product.colourHex,
      image: sql<{ url: string; alt: string } | null>`(
        SELECT json_build_object('url', i.url, 'alt', i.alt) FROM ${schema.productImage} i
        WHERE i.product_id = ${schema.product.id} ORDER BY i.sort_order LIMIT 1)`,
      collectionIds: sql<string[]>`coalesce((SELECT array_agg(cp.collection_id::text) FROM ${schema.collectionProduct} cp WHERE cp.product_id = ${schema.product.id}), '{}')`,
    })
    .from(schema.cartItem)
    .innerJoin(schema.productVariant, eq(schema.productVariant.id, schema.cartItem.variantId))
    .innerJoin(schema.product, eq(schema.product.id, schema.productVariant.productId))
    .where(eq(schema.cartItem.cartId, cartId))
    .orderBy(asc(schema.cartItem.createdAt));

  return rows.map((r) => {
    const unitPrice = effectiveUnitPrice(r.productPrice, r.priceOverride);
    const issues: CartLineIssue[] = [];
    let purchasable = r.quantity;
    if (!r.variantActive || r.productStatus !== "active") {
      issues.push("unavailable");
      purchasable = 0;
    } else if (r.stockOnHand <= 0) {
      issues.push("out_of_stock");
      purchasable = 0;
    } else if (r.stockOnHand < r.quantity) {
      issues.push("quantity_reduced");
      purchasable = r.stockOnHand;
    }
    if (unitPrice !== r.priceAtAdd) issues.push("price_changed");
    return {
      variantId: r.variantId,
      productId: r.productId,
      productSlug: r.productSlug,
      productName: r.productName,
      department: r.department,
      size: r.size,
      colourName: r.colourName,
      colourHex: r.colourHex,
      sku: r.sku,
      image: r.image,
      quantity: r.quantity,
      purchasableQuantity: purchasable,
      unitPrice,
      previousUnitPrice: r.priceAtAdd,
      lineTotal: unitPrice * purchasable,
      stockOnHand: r.stockOnHand,
      collectionIds: r.collectionIds,
      issues,
    };
  });
}

export function toPricingLines(lines: CartLine[]): PricingLine[] {
  return lines
    .filter((l) => l.purchasableQuantity > 0)
    .map((l) => ({
      variantId: l.variantId,
      productId: l.productId,
      department: l.department,
      collectionIds: l.collectionIds,
      unitPrice: l.unitPrice,
      quantity: l.purchasableQuantity,
    }));
}

async function buildCartView(cartId: string | null, discountCodeOverride?: string | null): Promise<CartView> {
  const settings = await getSettings();
  const method = settings.shipping.methods[0] ?? null;
  const empty: CartView = {
    id: cartId,
    lines: [],
    itemCount: 0,
    discount: null,
    totals: computeTotals({ lines: [], discount: 0, shipping: method, tax: settings.tax }),
    shippingMethod: method ? { id: method.id, label: method.label, estimate: method.estimate } : null,
    hasBlockingIssues: false,
    currency: "INR",
  };
  if (!cartId) return empty;

  const [cartRow] = await db.select().from(schema.cart).where(eq(schema.cart.id, cartId));
  if (!cartRow) return { ...empty, id: null };
  const lines = await loadCartLines(cartId);
  const pricingLines = toPricingLines(lines);

  let discount: CartView["discount"] = null;
  let discountAmount = 0;
  const code = discountCodeOverride !== undefined ? discountCodeOverride : cartRow.discountCode;
  if (code) {
    const rule = await loadDiscountRule(code);
    if (!rule) discount = { code, ok: false, message: "We couldn't find that code." };
    else {
      const user = await getCurrentUser();
      const used = rule.oncePerCustomer && user ? await customerHasUsedDiscount(rule.id, { userId: user.id }) : false;
      const result = evaluateDiscount(rule, pricingLines, new Date(), { customerHasUsed: used });
      if (result.ok) {
        discount = { code: rule.code, ok: true, amount: result.amount };
        discountAmount = result.amount;
      } else discount = { code: rule.code, ok: false, message: discountMessages[result.reason] };
    }
  }

  return {
    ...empty,
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    discount,
    totals: computeTotals({ lines: pricingLines, discount: discountAmount, shipping: method, tax: settings.tax }),
    hasBlockingIssues: lines.some((l) => l.issues.includes("unavailable") || l.issues.includes("out_of_stock") || l.issues.includes("quantity_reduced")),
  };
}

export const getCartView = cache(async (): Promise<CartView> => buildCartView(await resolveCartId()));

export const getCartCount = cache(async (): Promise<number> => {
  const id = await resolveCartId();
  if (!id) return 0;
  const [r] = await db
    .select({ n: sql<number>`coalesce(sum(${schema.cartItem.quantity}), 0)::int` })
    .from(schema.cartItem)
    .where(eq(schema.cartItem.cartId, id));
  return r?.n ?? 0;
});

/** Removes lines that can't be bought and caps quantities to stock. */
export async function reconcileCart(): Promise<void> {
  const cartId = await resolveCartId();
  if (!cartId) return;
  const lines = await loadCartLines(cartId);
  for (const l of lines) {
    if (l.purchasableQuantity === 0) {
      await db.delete(schema.cartItem).where(and(eq(schema.cartItem.cartId, cartId), eq(schema.cartItem.variantId, l.variantId)));
    } else if (l.purchasableQuantity !== l.quantity || l.unitPrice !== l.previousUnitPrice) {
      await db
        .update(schema.cartItem)
        .set({ quantity: l.purchasableQuantity, priceAtAdd: l.unitPrice })
        .where(and(eq(schema.cartItem.cartId, cartId), eq(schema.cartItem.variantId, l.variantId)));
    }
  }
}
