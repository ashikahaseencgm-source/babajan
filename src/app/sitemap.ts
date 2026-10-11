import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { isIndexable, siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Only active products/collections; nothing at all outside production. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexable()) return [];
  const base = siteUrl();
  const [products, collections, categories] = await Promise.all([
    db.select({ slug: schema.product.slug, updatedAt: schema.product.updatedAt }).from(schema.product).where(and(eq(schema.product.status, "active"), eq(schema.product.isSample, false))),
    db.select({ slug: schema.collection.slug, updatedAt: schema.collection.updatedAt }).from(schema.collection).where(eq(schema.collection.isActive, true)),
    db.select({ slug: schema.category.slug, department: schema.category.department }).from(schema.category).where(eq(schema.category.isActive, true)),
  ]);
  const staticPaths = ["", "/women", "/men", "/collections", "/new-arrivals", "/shop", "/about", "/contact", "/size-guide", "/policies/shipping", "/policies/returns", "/policies/privacy", "/policies/terms"];
  return [
    ...staticPaths.map((p) => ({ url: `${base}${p}` })),
    ...categories.filter((c) => c.department !== "unisex").map((c) => ({ url: `${base}/${c.department}/${c.slug}` })),
    ...collections.map((c) => ({ url: `${base}/collections/${c.slug}`, lastModified: c.updatedAt })),
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
