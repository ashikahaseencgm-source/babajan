/**
 * Database schema (PostgreSQL via Drizzle ORM).
 *
 * Conventions
 * - Money is stored as integer minor units (paise for INR). Never floats.
 * - Timestamps are `timestamptz`.
 * - Auth tables (`user`, `session`, `account`, `verification`) follow the
 *   Better Auth schema; `user.role` is an additional field that customers can
 *   never set themselves (see src/server/auth.ts — `input: false`).
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () =>
  ts("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ────────────────────────────── Auth (Better Auth) ────────────────────────────── */

export const userRole = pgEnum("user_role", ["customer", "staff", "admin"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRole("role").notNull().default("customer"),
  phone: text("phone"),
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: ts("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: ts("access_token_expires_at"),
    refreshTokenExpiresAt: ts("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: ts("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/** Better Auth's own rate-limit store (database-backed so limits hold across instances). */
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/* ────────────────────────────── Catalogue ────────────────────────────── */

export const department = pgEnum("department", ["women", "men", "unisex"]);
export const productStatus = pgEnum("product_status", ["draft", "active", "archived"]);

export const category = pgTable(
  "category",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    department: department("department").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("category_department_slug_uq").on(t.department, t.slug)],
);

export const collection = pgTable("collection", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  imageUrl: text("image_url"),
  imageAlt: text("image_alt"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const product = pgTable(
  "product",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    /** Style code; variant SKUs are derived as `${styleCode}-${size}` by default. */
    styleCode: text("style_code").notNull().unique(),
    department: department("department").notNull(),
    categoryId: uuid("category_id").references(() => category.id, { onDelete: "set null" }),
    styleLine: text("style_line"),
    description: text("description"),
    materials: text("materials"),
    fit: text("fit"),
    care: text("care"),
    measurements: text("measurements"),
    includedItems: text("included_items"),
    colourName: text("colour_name"),
    /** Hex used only for the swatch dot / placeholder art. Not shown as text. */
    colourHex: text("colour_hex"),
    occasions: text("occasions").array().notNull().default(sql`'{}'::text[]`),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    /** Selling price in paise. */
    price: integer("price").notNull(),
    /** Previous price in paise. Only shown as a sale when strictly greater than `price`. */
    compareAtPrice: integer("compare_at_price"),
    currency: text("currency").notNull().default("INR"),
    status: productStatus("status").notNull().default("draft"),
    isSample: boolean("is_sample").notNull().default(false),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    publishedAt: ts("published_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("product_status_dept_idx").on(t.status, t.department),
    index("product_category_idx").on(t.categoryId),
    check("product_price_positive", sql`${t.price} > 0`),
    check("product_compare_at_valid", sql`${t.compareAtPrice} IS NULL OR ${t.compareAtPrice} > 0`),
  ],
);

export const productImage = pgTable(
  "product_image",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("product_image_product_idx").on(t.productId, t.sortOrder)],
);

export const productVariant = pgTable(
  "product_variant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    /** e.g. "S", "M", "40", "Free size". Null for products with no size. */
    size: text("size"),
    sortOrder: integer("sort_order").notNull().default(0),
    /** Optional per-variant price in paise (e.g. larger sizes). Null = product price. */
    priceOverride: integer("price_override"),
    stockOnHand: integer("stock_on_hand").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("variant_product_idx").on(t.productId),
    check("variant_stock_non_negative", sql`${t.stockOnHand} >= 0`),
    check("variant_price_override_positive", sql`${t.priceOverride} IS NULL OR ${t.priceOverride} > 0`),
  ],
);

export const collectionProduct = pgTable(
  "collection_product",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.productId] }), index("collection_product_product_idx").on(t.productId)],
);

/* ────────────────────────────── Cart ────────────────────────────── */

export const cart = pgTable(
  "cart",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    discountCode: text("discount_code"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("cart_user_idx").on(t.userId)],
);

export const cartItem = pgTable(
  "cart_item",
  {
    cartId: uuid("cart_id")
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariant.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    /** Unit price (paise) when the item was added; used to tell the customer if it changed. */
    priceAtAdd: integer("price_at_add").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.cartId, t.variantId] }), check("cart_item_qty_positive", sql`${t.quantity} > 0`)],
);

/* ────────────────────────────── Discounts ────────────────────────────── */

export const discountType = pgEnum("discount_type", ["percentage", "fixed"]);
export const discountScope = pgEnum("discount_scope", ["all", "department", "collection"]);

export const discount = pgTable(
  "discount",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Stored upper-case. */
    code: text("code").notNull().unique(),
    description: text("description"),
    type: discountType("type").notNull(),
    /** Percentage (1–90) for percentage discounts, paise for fixed. */
    value: integer("value").notNull(),
    minSubtotal: integer("min_subtotal").notNull().default(0),
    scope: discountScope("scope").notNull().default("all"),
    scopeDepartment: department("scope_department"),
    scopeCollectionId: uuid("scope_collection_id").references(() => collection.id, { onDelete: "set null" }),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    usageLimit: integer("usage_limit"),
    usageCount: integer("usage_count").notNull().default(0),
    oncePerCustomer: boolean("once_per_customer").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("discount_value_positive", sql`${t.value} > 0`),
    check("discount_pct_range", sql`${t.type} <> 'percentage' OR ${t.value} <= 90`),
    check("discount_usage_within_limit", sql`${t.usageLimit} IS NULL OR ${t.usageCount} <= ${t.usageLimit}`),
  ],
);

/* ────────────────────────────── Orders & payments ────────────────────────────── */

export const orderStatus = pgEnum("order_status", ["pending_payment", "confirmed", "cancelled", "expired"]);
export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refund_pending",
  "partially_refunded",
  "refunded",
]);
export const fulfillmentStatus = pgEnum("fulfillment_status", [
  "unfulfilled",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
]);

export type AddressSnapshot = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export const order = pgTable(
  "order",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: text("order_number").notNull().unique(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    shippingAddress: jsonb("shipping_address").$type<AddressSnapshot>().notNull(),
    shippingMethod: text("shipping_method").notNull(),
    subtotal: integer("subtotal").notNull(),
    discountTotal: integer("discount_total").notNull().default(0),
    shippingTotal: integer("shipping_total").notNull().default(0),
    /** Tax amount included in (or added to) the total, per store tax settings. */
    taxTotal: integer("tax_total").notNull().default(0),
    taxInclusive: boolean("tax_inclusive").notNull(),
    grandTotal: integer("grand_total").notNull(),
    currency: text("currency").notNull().default("INR"),
    discountCode: text("discount_code"),
    discountId: uuid("discount_id").references(() => discount.id, { onDelete: "set null" }),
    status: orderStatus("status").notNull().default("pending_payment"),
    paymentStatus: paymentStatus("payment_status").notNull().default("pending"),
    fulfillmentStatus: fulfillmentStatus("fulfillment_status").notNull().default("unfulfilled"),
    /** Stock is held until this time while awaiting payment. */
    reservedUntil: ts("reserved_until"),
    /** True while this order holds stock that must be released if unpaid. */
    stockReserved: boolean("stock_reserved").notNull().default(true),
    /** Version for HMAC-derived guest access links; incrementing it revokes earlier links. */
    accessVersion: integer("access_version").notNull().default(1),
    /** Client-supplied idempotency key to stop duplicate submissions creating two orders. */
    checkoutKey: text("checkout_key").notNull().unique(),
    customerNote: text("customer_note"),
    trackingCarrier: text("tracking_carrier"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    needsAttention: boolean("needs_attention").notNull().default(false),
    isTest: boolean("is_test").notNull().default(false),
    paidAt: ts("paid_at"),
    cancelledAt: ts("cancelled_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("order_user_idx").on(t.userId, t.createdAt),
    index("order_email_idx").on(t.email),
    index("order_status_idx").on(t.status, t.createdAt),
    index("order_created_idx").on(t.createdAt),
    check("order_totals_non_negative", sql`${t.grandTotal} >= 0 AND ${t.subtotal} >= 0`),
  ],
);

export const orderItem = pgTable(
  "order_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => product.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariant.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    productSlug: text("product_slug").notNull(),
    variantLabel: text("variant_label"),
    sku: text("sku").notNull(),
    imageUrl: text("image_url"),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (t) => [index("order_item_order_idx").on(t.orderId), check("order_item_qty_positive", sql`${t.quantity} > 0`)],
);

export const orderEvent = pgTable(
  "order_event",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    message: text("message").notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    /** Shown to the customer on their order page when true. */
    customerVisible: boolean("customer_visible").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("order_event_order_idx").on(t.orderId, t.createdAt)],
);

export const paymentRecordStatus = pgEnum("payment_record_status", ["created", "authorized", "captured", "failed"]);

export const payment = pgTable(
  "payment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerOrderId: text("provider_order_id").notNull(),
    providerPaymentId: text("provider_payment_id"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    status: paymentRecordStatus("status").notNull().default("created"),
    failureReason: text("failure_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("payment_provider_order_uq").on(t.provider, t.providerOrderId),
    uniqueIndex("payment_provider_payment_uq").on(t.provider, t.providerPaymentId),
    index("payment_order_idx").on(t.orderId),
  ],
);

/** Every inbound provider event, keyed for idempotency. */
export const paymentEvent = pgTable(
  "payment_event",
  {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    processedAt: ts("processed_at"),
    outcome: text("outcome"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("payment_event_provider_event_uq").on(t.provider, t.eventId)],
);

export const refundStatus = pgEnum("refund_status", ["pending", "processed", "failed"]);

export const refund = pgTable(
  "refund",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payment.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    status: refundStatus("status").notNull().default("pending"),
    providerRefundId: text("provider_refund_id"),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    restock: boolean("restock").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("refund_order_idx").on(t.orderId),
    uniqueIndex("refund_provider_uq").on(t.providerRefundId),
    check("refund_amount_positive", sql`${t.amount} > 0`),
  ],
);

/* ────────────────────────────── Customers ────────────────────────────── */

export const address = pgTable(
  "address",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postal_code").notNull(),
    country: text("country").notNull().default("IN"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("address_user_idx").on(t.userId)],
);

/* ────────────────────────────── Content, settings, comms ────────────────────────────── */

/** Structured, schema-validated content blocks (no arbitrary HTML). */
export const contentBlock = pgTable("content_block", {
  key: text("key").primaryKey(),
  data: jsonb("data").notNull(),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

/** Store configuration (shipping, tax, returns, contact). Validated by zod on read & write. */
export const storeSetting = pgTable("store_setting", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

export const newsletterStatus = pgEnum("newsletter_status", ["pending", "confirmed", "unsubscribed"]);

export const newsletterSubscriber = pgTable("newsletter_subscriber", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  status: newsletterStatus("status").notNull().default("pending"),
  tokenHash: text("token_hash").notNull(),
  consentAt: ts("consent_at").notNull(),
  confirmedAt: ts("confirmed_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const contactStatus = pgEnum("contact_status", ["new", "in_progress", "closed"]);

export const contactMessage = pgTable(
  "contact_message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    orderNumber: text("order_number"),
    topic: text("topic").notNull(),
    message: text("message").notNull(),
    status: contactStatus("status").notNull().default("new"),
    createdAt: createdAt(),
  },
  (t) => [index("contact_status_idx").on(t.status, t.createdAt)],
);

/** Development outbox: every email is recorded here when EMAIL_PROVIDER=console. */
export const emailOutbox = pgTable("email_outbox", {
  id: serial("id").primaryKey(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  text: text("text").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  error: text("error"),
  createdAt: createdAt(),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    /** Never contains passwords, tokens, or payment secrets. */
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt), index("audit_entity_idx").on(t.entityType, t.entityId)],
);

/** Fixed-window rate limiting shared across server instances. */
export const rateLimitBucket = pgTable("rate_limit_bucket", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: ts("window_start").notNull(),
});

/** Human-friendly order numbers: BS-<year>-<6 digits>. */
export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 1001 });
