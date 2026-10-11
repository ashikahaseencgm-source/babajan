import "server-only";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/server/db";
import type { Department } from "@/server/domain/pricing";

const p = schema.product;
const v = schema.productVariant;

import { sortOptions, type Facets, type SortKey } from "./catalog-shared";
export { sortOptions, type Facets, type SortKey };

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  department: Department;
  categoryName: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  colourName: string | null;
  colourHex: string | null;
  image: { url: string; alt: string; width: number; height: number } | null;
  inStock: boolean;
  isSample: boolean;
};

export type ListingQuery = {
  department?: Department;
  categorySlug?: string;
  collectionSlug?: string;
  q?: string;
  sizes?: string[];
  colours?: string[];
  occasions?: string[];
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
};


const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

/** Free-text search across name, style code, SKUs, category, colour, tags and occasions. */
function searchCondition(q: string): SQL | undefined {
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 6);
  if (tokens.length === 0) return undefined;
  const perToken = tokens.map((t) => {
    const pattern = `%${escapeLike(t)}%`;
    return sql`(
      ${p.name} ILIKE ${pattern}
      OR ${p.styleCode} ILIKE ${pattern}
      OR coalesce(${p.colourName}, '') ILIKE ${pattern}
      OR array_to_string(${p.tags}, ' ') ILIKE ${pattern}
      OR array_to_string(${p.occasions}, ' ') ILIKE ${pattern}
      OR ${p.department}::text ILIKE ${pattern}
      OR EXISTS (SELECT 1 FROM ${schema.category} c WHERE c.id = ${p.categoryId} AND c.name ILIKE ${pattern})
      OR EXISTS (SELECT 1 FROM ${v} sv WHERE sv.product_id = ${p.id} AND sv.sku ILIKE ${pattern})
    )`;
  });
  return and(...perToken);
}

function inStockExists(sizes?: string[]): SQL {
  if (sizes && sizes.length) {
    return sql`EXISTS (SELECT 1 FROM ${v} x WHERE x.product_id = ${p.id} AND x.is_active AND x.stock_on_hand > 0 AND x.size IN ${sizes})`;
  }
  return sql`EXISTS (SELECT 1 FROM ${v} x WHERE x.product_id = ${p.id} AND x.is_active AND x.stock_on_hand > 0)`;
}

async function scopeConditions(query: ListingQuery): Promise<{ conditions: SQL[]; collectionId: string | null }> {
  const conditions: SQL[] = [eq(p.status, "active")];
  let collectionId: string | null = null;
  if (query.department) conditions.push(inArray(p.department, [query.department, "unisex"]));
  if (query.categorySlug && query.department) {
    conditions.push(
      sql`${p.categoryId} IN (SELECT id FROM ${schema.category} WHERE slug = ${query.categorySlug} AND department = ${query.department})`,
    );
  }
  if (query.collectionSlug) {
    const [c] = await db
      .select({ id: schema.collection.id })
      .from(schema.collection)
      .where(and(eq(schema.collection.slug, query.collectionSlug), eq(schema.collection.isActive, true)));
    collectionId = c?.id ?? "00000000-0000-0000-0000-000000000000";
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${schema.collectionProduct} cp WHERE cp.product_id = ${p.id} AND cp.collection_id = ${collectionId})`,
    );
  }
  if (query.q) {
    const s = searchCondition(query.q);
    if (s) conditions.push(s);
  }
  return { conditions, collectionId };
}

export async function listProducts(query: ListingQuery): Promise<{
  items: ProductCardData[];
  total: number;
  page: number;
  pageCount: number;
  facets: Facets;
}> {
  const pageSize = Math.min(Math.max(query.pageSize ?? 24, 1), 48);
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const { conditions: scope, collectionId } = await scopeConditions(query);

  const filters: SQL[] = [...scope];
  if (query.sizes?.length) {
    filters.push(sql`EXISTS (SELECT 1 FROM ${v} x WHERE x.product_id = ${p.id} AND x.is_active AND x.size IN ${query.sizes})`);
  }
  if (query.colours?.length) filters.push(inArray(p.colourName, query.colours));
  if (query.occasions?.length) filters.push(sql`${p.occasions} && ${sql.param(query.occasions)}::text[]`);
  if (query.categories?.length) {
    filters.push(sql`${p.categoryId} IN (SELECT id FROM ${schema.category} WHERE slug IN ${query.categories})`);
  }
  if (query.minPrice != null) filters.push(sql`${p.price} >= ${query.minPrice}`);
  if (query.maxPrice != null) filters.push(sql`${p.price} <= ${query.maxPrice}`);
  if (query.inStockOnly) filters.push(inStockExists(query.sizes));

  const where = and(...filters);

  let orderBy: SQL[];
  switch (query.sort) {
    case "price-asc":
      orderBy = [asc(p.price), desc(p.publishedAt)];
      break;
    case "price-desc":
      orderBy = [desc(p.price), desc(p.publishedAt)];
      break;
    case "newest":
      orderBy = [desc(p.publishedAt), desc(p.createdAt)];
      break;
    default:
      orderBy = collectionId
        ? [
            sql`(SELECT cp.sort_order FROM ${schema.collectionProduct} cp WHERE cp.product_id = ${p.id} AND cp.collection_id = ${collectionId})`,
            desc(p.publishedAt),
          ]
        : [desc(p.publishedAt), asc(p.name)];
  }

  const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(p).where(where);
  const total = countRow?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rows = await db
    .select({ id: p.id })
    .from(p)
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((Math.min(page, pageCount) - 1) * pageSize);

  const items = await cardsForIds(rows.map((r) => r.id));
  const facets = await facetsFor(and(...scope));
  return { items, total, page: Math.min(page, pageCount), pageCount, facets };
}

/** Loads card data for ids in a single round-trip set (no N+1), preserving order. */
export async function cardsForIds(ids: string[]): Promise<ProductCardData[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      id: p.id,
      slug: p.slug,
      name: p.name,
      department: p.department,
      categoryName: schema.category.name,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      currency: p.currency,
      colourName: p.colourName,
      colourHex: p.colourHex,
      isSample: p.isSample,
      inStock: sql<boolean>`EXISTS (SELECT 1 FROM ${v} x WHERE x.product_id = ${p.id} AND x.is_active AND x.stock_on_hand > 0)`,
    })
    .from(p)
    .leftJoin(schema.category, eq(schema.category.id, p.categoryId))
    .where(inArray(p.id, ids));

  const images = await db
    .selectDistinctOn([schema.productImage.productId], {
      productId: schema.productImage.productId,
      url: schema.productImage.url,
      alt: schema.productImage.alt,
      width: schema.productImage.width,
      height: schema.productImage.height,
    })
    .from(schema.productImage)
    .where(inArray(schema.productImage.productId, ids))
    .orderBy(schema.productImage.productId, asc(schema.productImage.sortOrder));
  const imageBy = new Map(images.map((i) => [i.productId, i]));
  const byId = new Map(rows.map((r) => [r.id, r]));

  return ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => {
      const img = imageBy.get(r.id);
      return {
        ...r,
        image: img ? { url: img.url, alt: img.alt, width: img.width, height: img.height } : null,
      };
    });
}

async function facetsFor(where: SQL | undefined): Promise<Facets> {
  const [sizes, colours, occasions, categories, price] = await Promise.all([
    db
      .selectDistinct({ size: v.size, sortOrder: v.sortOrder })
      .from(v)
      .innerJoin(p, eq(p.id, v.productId))
      .where(and(where, eq(v.isActive, true), sql`${v.size} IS NOT NULL`))
      .orderBy(asc(v.sortOrder), asc(v.size)),
    db
      .selectDistinct({ name: p.colourName, hex: p.colourHex })
      .from(p)
      .where(and(where, sql`${p.colourName} IS NOT NULL`))
      .orderBy(asc(p.colourName)),
    db.execute<{ occasion: string }>(
      sql`SELECT DISTINCT unnest(${p.occasions}) AS occasion FROM ${p} WHERE ${where ?? sql`true`} ORDER BY 1`,
    ),
    db
      .selectDistinct({ slug: schema.category.slug, name: schema.category.name, sortOrder: schema.category.sortOrder })
      .from(p)
      .innerJoin(schema.category, eq(schema.category.id, p.categoryId))
      .where(and(where, eq(schema.category.isActive, true)))
      .orderBy(asc(schema.category.sortOrder), asc(schema.category.name)),
    db
      .select({ min: sql<number | null>`min(${p.price})::int`, max: sql<number | null>`max(${p.price})::int` })
      .from(p)
      .where(where),
  ]);

  const seenSizes = new Set<string>();
  const orderedSizes: string[] = [];
  for (const s of sizes) {
    if (s.size && !seenSizes.has(s.size)) {
      seenSizes.add(s.size);
      orderedSizes.push(s.size);
    }
  }
  const seenCats = new Set<string>();
  const cats = categories.filter((c) => (seenCats.has(c.slug) ? false : (seenCats.add(c.slug), true)));
  const pr = price[0];
  return {
    sizes: orderedSizes,
    colours: colours.filter((c): c is { name: string; hex: string | null } => !!c.name),
    occasions: occasions.rows.map((r) => r.occasion),
    categories: cats.map(({ slug, name }) => ({ slug, name })),
    price: pr && pr.min != null && pr.max != null ? { min: pr.min, max: pr.max } : null,
  };
}

/* ────────────────────────────── Product detail ────────────────────────────── */

export const getProductBySlug = cache(async (slug: string) => {
  const [row] = await db
    .select({ product: p, category: schema.category })
    .from(p)
    .leftJoin(schema.category, eq(schema.category.id, p.categoryId))
    .where(eq(p.slug, slug));
  if (!row || row.product.status === "draft") return null;

  const [images, variants, collections] = await Promise.all([
    db.select().from(schema.productImage).where(eq(schema.productImage.productId, row.product.id)).orderBy(asc(schema.productImage.sortOrder)),
    db
      .select()
      .from(v)
      .where(and(eq(v.productId, row.product.id), eq(v.isActive, true)))
      .orderBy(asc(v.sortOrder), asc(v.size)),
    db
      .select({ id: schema.collection.id, slug: schema.collection.slug, name: schema.collection.name })
      .from(schema.collectionProduct)
      .innerJoin(schema.collection, eq(schema.collection.id, schema.collectionProduct.collectionId))
      .where(and(eq(schema.collectionProduct.productId, row.product.id), eq(schema.collection.isActive, true))),
  ]);

  return { ...row.product, category: row.category, images, variants, collections };
});

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

/** Related pieces: same category first, then shared collection, then same department. */
export async function relatedProducts(product: ProductDetail, limit = 4): Promise<ProductCardData[]> {
  const collectionIds = product.collections.map((c) => c.id);
  const rows = await db
    .select({ id: p.id })
    .from(p)
    .where(
      and(
        eq(p.status, "active"),
        sql`${p.id} <> ${product.id}`,
        inArray(p.department, product.department === "unisex" ? ["women", "men", "unisex"] : [product.department, "unisex"]),
      ),
    )
    .orderBy(
      sql`CASE WHEN ${p.categoryId} = ${product.categoryId ?? null} THEN 0 ELSE 1 END`,
      collectionIds.length
        ? sql`CASE WHEN EXISTS (SELECT 1 FROM ${schema.collectionProduct} cp WHERE cp.product_id = ${p.id} AND cp.collection_id IN ${collectionIds}) THEN 0 ELSE 1 END`
        : sql`0`,
      desc(p.publishedAt),
    )
    .limit(limit);
  return cardsForIds(rows.map((r) => r.id));
}

/* ────────────────────────────── Navigation data ────────────────────────────── */

export const getCategories = cache(async (department?: Department) => {
  return db
    .select({
      id: schema.category.id,
      slug: schema.category.slug,
      name: schema.category.name,
      department: schema.category.department,
      description: schema.category.description,
      // Explicitly qualified: drizzle leaves columns unqualified in single-table selects.
      productCount: sql<number>`(SELECT count(*)::int FROM "product" pc WHERE pc.category_id = "category"."id" AND pc.status = 'active')`,
    })
    .from(schema.category)
    .where(and(eq(schema.category.isActive, true), department ? eq(schema.category.department, department) : undefined))
    .orderBy(asc(schema.category.sortOrder), asc(schema.category.name));
});

export const getCategory = cache(async (department: Department, slug: string) => {
  const [c] = await db
    .select()
    .from(schema.category)
    .where(and(eq(schema.category.department, department), eq(schema.category.slug, slug), eq(schema.category.isActive, true)));
  return c ?? null;
});

export const getCollections = cache(async (opts: { featuredOnly?: boolean } = {}) => {
  return db
    .select({
      id: schema.collection.id,
      slug: schema.collection.slug,
      name: schema.collection.name,
      tagline: schema.collection.tagline,
      description: schema.collection.description,
      imageUrl: schema.collection.imageUrl,
      imageAlt: schema.collection.imageAlt,
      isFeatured: schema.collection.isFeatured,
      productCount: sql<number>`(SELECT count(*)::int FROM "collection_product" cp JOIN "product" pp ON pp.id = cp.product_id WHERE cp.collection_id = "collection"."id" AND pp.status = 'active')`,
    })
    .from(schema.collection)
    .where(and(eq(schema.collection.isActive, true), opts.featuredOnly ? eq(schema.collection.isFeatured, true) : undefined))
    .orderBy(asc(schema.collection.sortOrder), asc(schema.collection.name));
});

export const getCollection = cache(async (slug: string) => {
  const [c] = await db
    .select()
    .from(schema.collection)
    .where(and(eq(schema.collection.slug, slug), eq(schema.collection.isActive, true)));
  return c ?? null;
});

export async function newestProducts(limit: number, department?: Department): Promise<ProductCardData[]> {
  const rows = await db
    .select({ id: p.id })
    .from(p)
    .where(and(eq(p.status, "active"), department ? inArray(p.department, [department, "unisex"]) : undefined))
    .orderBy(desc(p.publishedAt), desc(p.createdAt))
    .limit(limit);
  return cardsForIds(rows.map((r) => r.id));
}

export async function collectionProducts(collectionId: string, limit: number): Promise<ProductCardData[]> {
  const rows = await db
    .select({ id: p.id })
    .from(schema.collectionProduct)
    .innerJoin(p, eq(p.id, schema.collectionProduct.productId))
    .where(and(eq(schema.collectionProduct.collectionId, collectionId), eq(p.status, "active")))
    .orderBy(asc(schema.collectionProduct.sortOrder))
    .limit(limit);
  return cardsForIds(rows.map((r) => r.id));
}

/** Quick suggestions for the search overlay. */
export async function searchSuggestions(q: string, limit = 6) {
  const cond = searchCondition(q);
  if (!cond) return [];
  const rows = await db
    .select({ id: p.id })
    .from(p)
    .where(and(eq(p.status, "active"), cond))
    .orderBy(desc(p.publishedAt))
    .limit(limit);
  return cardsForIds(rows.map((r) => r.id));
}

export const hasSampleProducts = cache(async () => {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(p).where(and(eq(p.isSample, true), eq(p.status, "active")));
  return (r?.n ?? 0) > 0;
});
