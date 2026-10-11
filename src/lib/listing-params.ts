import type { ListingQuery, SortKey } from "@/server/catalog";

export type RawSearchParams = Record<string, string | string[] | undefined>;

const SORTS: SortKey[] = ["featured", "newest", "price-asc", "price-desc"];

function many(v: string | string[] | undefined, max = 20): string[] {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  return arr
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 60)
    .slice(0, max);
}

function rupees(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s || !/^\d{1,7}$/.test(s)) return undefined;
  return Number(s) * 100;
}

/** Parses untrusted URL params into a bounded, validated listing query. */
export function parseListingParams(sp: RawSearchParams): Omit<ListingQuery, "department" | "categorySlug" | "collectionSlug"> {
  const sortRaw = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const pageRaw = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page);
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 100);
  return {
    q: q || undefined,
    sizes: many(sp.size),
    colours: many(sp.colour),
    occasions: many(sp.occasion),
    categories: many(sp.category),
    minPrice: rupees(sp.min),
    maxPrice: rupees(sp.max),
    inStockOnly: sp.stock === "1",
    sort: SORTS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : "featured",
    page: Number.isFinite(pageRaw) && pageRaw >= 1 && pageRaw <= 1000 ? Math.floor(pageRaw) : 1,
  };
}

/** Builds a URL with the given params changed (null removes). Arrays become repeated keys. */
export function withParams(path: string, sp: RawSearchParams, changes: Record<string, string | string[] | null>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v == null || k in changes) continue;
    for (const item of Array.isArray(v) ? v : [v]) params.append(k, item);
  }
  for (const [k, v] of Object.entries(changes)) {
    if (v == null) continue;
    for (const item of Array.isArray(v) ? v : [v]) params.append(k, item);
  }
  if (!("page" in changes)) params.delete("page");
  const s = params.toString();
  return s ? `${path}?${s}` : path;
}

export function hasActiveFilters(sp: RawSearchParams): boolean {
  return ["size", "colour", "occasion", "category", "min", "max", "stock"].some((k) => sp[k] != null && sp[k] !== "");
}
