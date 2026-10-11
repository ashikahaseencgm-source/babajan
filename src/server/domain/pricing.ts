/**
 * Pure pricing logic shared by the bag, checkout and order creation.
 * The server always recomputes totals from the database — never from values
 * the browser sends. All amounts are integer paise.
 */

export type Department = "women" | "men" | "unisex";

export type PricingLine = {
  variantId: string;
  productId: string;
  department: Department;
  collectionIds: string[];
  unitPrice: number;
  quantity: number;
};

export type DiscountRule = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minSubtotal: number;
  scope: "all" | "department" | "collection";
  scopeDepartment: Department | null;
  scopeCollectionId: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  oncePerCustomer: boolean;
};

export type ShippingMethod = {
  id: string;
  label: string;
  fee: number;
  freeAbove: number | null;
  estimate: string | null;
};

export type TaxSettings = {
  pricesIncludeTax: boolean;
  /** Basis points, e.g. 500 = 5%. 0 means "not configured" — no breakdown is shown. */
  rateBps: number;
};

export type DiscountEvaluation =
  | { ok: true; amount: number; eligibleSubtotal: number }
  | { ok: false; reason: DiscountRejection };

export type DiscountRejection =
  | "inactive"
  | "not_started"
  | "expired"
  | "usage_limit"
  | "min_subtotal"
  | "not_eligible"
  | "already_used";

export const discountMessages: Record<DiscountRejection, string> = {
  inactive: "This code isn't active.",
  not_started: "This code isn't active yet.",
  expired: "This code has expired.",
  usage_limit: "This code is no longer available.",
  min_subtotal: "Your bag doesn't meet the minimum spend for this code.",
  not_eligible: "This code doesn't apply to the items in your bag.",
  already_used: "This code has already been used with your account.",
};

export function lineTotal(line: Pick<PricingLine, "unitPrice" | "quantity">): number {
  return line.unitPrice * line.quantity;
}

export function subtotalOf(lines: Pick<PricingLine, "unitPrice" | "quantity">[]): number {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0);
}

/** A sale is displayed only when the previous price is strictly higher than the selling price. */
export function isValidSale(price: number, compareAtPrice: number | null | undefined): compareAtPrice is number {
  return typeof compareAtPrice === "number" && compareAtPrice > price;
}

export function effectiveUnitPrice(productPrice: number, variantPriceOverride: number | null | undefined): number {
  return variantPriceOverride ?? productPrice;
}

function lineIsEligible(line: PricingLine, rule: DiscountRule): boolean {
  switch (rule.scope) {
    case "all":
      return true;
    case "department":
      return rule.scopeDepartment != null && line.department === rule.scopeDepartment;
    case "collection":
      return rule.scopeCollectionId != null && line.collectionIds.includes(rule.scopeCollectionId);
  }
}

export function evaluateDiscount(
  rule: DiscountRule,
  lines: PricingLine[],
  now: Date,
  opts: { customerHasUsed?: boolean } = {},
): DiscountEvaluation {
  if (!rule.isActive) return { ok: false, reason: "inactive" };
  if (rule.startsAt && now < rule.startsAt) return { ok: false, reason: "not_started" };
  if (rule.endsAt && now > rule.endsAt) return { ok: false, reason: "expired" };
  if (rule.usageLimit != null && rule.usageCount >= rule.usageLimit) return { ok: false, reason: "usage_limit" };
  if (rule.oncePerCustomer && opts.customerHasUsed) return { ok: false, reason: "already_used" };

  const subtotal = subtotalOf(lines);
  if (subtotal < rule.minSubtotal) return { ok: false, reason: "min_subtotal" };

  const eligibleSubtotal = subtotalOf(lines.filter((l) => lineIsEligible(l, rule)));
  if (eligibleSubtotal <= 0) return { ok: false, reason: "not_eligible" };

  const raw = rule.type === "percentage" ? Math.floor((eligibleSubtotal * rule.value) / 100) : rule.value;
  const amount = Math.min(raw, eligibleSubtotal);
  return { ok: true, amount, eligibleSubtotal };
}

export function shippingFee(method: ShippingMethod, merchandiseAfterDiscount: number): number {
  if (method.freeAbove != null && merchandiseAfterDiscount >= method.freeAbove) return 0;
  return method.fee;
}

/**
 * Tax portion. When prices include tax, the tax is the included share and the
 * total is unchanged. When they don't, tax is added on top.
 */
export function computeTax(taxableAmount: number, tax: TaxSettings): { tax: number; added: number } {
  if (tax.rateBps <= 0) return { tax: 0, added: 0 };
  if (tax.pricesIncludeTax) {
    const included = taxableAmount - Math.round((taxableAmount * 10_000) / (10_000 + tax.rateBps));
    return { tax: included, added: 0 };
  }
  const added = Math.round((taxableAmount * tax.rateBps) / 10_000);
  return { tax: added, added };
}

export type Totals = {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  taxInclusive: boolean;
  grandTotal: number;
};

export function computeTotals(input: {
  lines: PricingLine[];
  discount: number;
  shipping: ShippingMethod | null;
  tax: TaxSettings;
}): Totals {
  const subtotal = subtotalOf(input.lines);
  const discountTotal = Math.min(Math.max(0, input.discount), subtotal);
  const merchandise = subtotal - discountTotal;
  const shippingTotal = input.shipping && input.lines.length > 0 ? shippingFee(input.shipping, merchandise) : 0;
  const { tax, added } = computeTax(merchandise + shippingTotal, input.tax);
  return {
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal: tax,
    taxInclusive: input.tax.pricesIncludeTax,
    grandTotal: merchandise + shippingTotal + added,
  };
}

export const MAX_QTY_PER_LINE = 10;
