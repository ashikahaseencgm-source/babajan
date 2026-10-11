import Link from "next/link";
import { X } from "lucide-react";
import { listProducts, type ListingQuery } from "@/server/catalog";
import { parseListingParams, withParams, hasActiveFilters, type RawSearchParams } from "@/lib/listing-params";
import { ProductGrid } from "./product-card";
import { FilterPanel } from "./filters";
import { EmptyState, Pagination } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

/**
 * Shared product listing: filters + sort + grid + pagination. All state lives
 * in the URL (shareable, crawlable, works without JavaScript).
 */
export async function Listing({
  path,
  scope,
  searchParams,
  hideCategoryFilter,
  showDepartment,
  emptyMessage,
}: {
  path: string;
  scope: Pick<ListingQuery, "department" | "categorySlug" | "collectionSlug" | "q">;
  searchParams: RawSearchParams;
  hideCategoryFilter?: boolean;
  showDepartment?: boolean;
  emptyMessage?: { title: string; body: string };
}) {
  const params = parseListingParams(searchParams);
  const result = await listProducts({ ...params, ...scope, q: scope.q ?? params.q });
  const { facets } = result;

  const chips: { label: string; href: string }[] = [];
  const removeOne = (key: string, value: string) => {
    const current = searchParams[key];
    const arr = (Array.isArray(current) ? current : current ? [current] : []).filter((v) => v !== value);
    return withParams(path, searchParams, { [key]: arr.length ? arr : null });
  };
  for (const s of params.sizes ?? []) chips.push({ label: `Size: ${s}`, href: removeOne("size", s) });
  for (const c of params.colours ?? []) chips.push({ label: `Colour: ${c}`, href: removeOne("colour", c) });
  for (const o of params.occasions ?? []) chips.push({ label: `Occasion: ${o}`, href: removeOne("occasion", o) });
  for (const c of params.categories ?? []) {
    const name = facets.categories.find((f) => f.slug === c)?.name ?? c;
    chips.push({ label: name, href: removeOne("category", c) });
  }
  if (params.minPrice != null) chips.push({ label: `From ${formatMoney(params.minPrice)}`, href: withParams(path, searchParams, { min: null }) });
  if (params.maxPrice != null) chips.push({ label: `Up to ${formatMoney(params.maxPrice)}`, href: withParams(path, searchParams, { max: null }) });
  if (params.inStockOnly) chips.push({ label: "In stock only", href: withParams(path, searchParams, { stock: null }) });

  const filtered = hasActiveFilters(searchParams);
  const keep: Record<string, string> = scope.q ? { q: scope.q } : params.q ? { q: params.q } : {};

  return (
    <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-12">
      <FilterPanel
        path={path}
        facets={{ ...facets, categories: hideCategoryFilter ? [] : facets.categories }}
        selected={{
          sizes: params.sizes ?? [],
          colours: params.colours ?? [],
          occasions: params.occasions ?? [],
          categories: params.categories ?? [],
          min: params.minPrice != null ? String(params.minPrice / 100) : "",
          max: params.maxPrice != null ? String(params.maxPrice / 100) : "",
          inStockOnly: !!params.inStockOnly,
          sort: params.sort ?? "featured",
        }}
        keep={keep}
        resultCount={result.total}
        activeCount={chips.length}
      />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mist pb-4">
          <p className="text-sm text-slate" role="status" aria-live="polite">
            {result.total === 1 ? "1 piece" : `${result.total} pieces`}
          </p>
        </div>

        {chips.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="sr-only">Active filters:</span>
            {chips.map((c) => (
              <Link
                key={c.href + c.label}
                href={c.href}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-navy/30 bg-white px-3 text-[0.8125rem] text-navy hover:border-navy"
              >
                {c.label}
                <X className="size-3.5" aria-hidden="true" />
                <span className="sr-only">— remove filter</span>
              </Link>
            ))}
            <Link href={withParams(path, {}, keep)} className="link ml-1 inline-flex min-h-9 items-center text-[0.8125rem]">
              Clear all
            </Link>
          </div>
        ) : null}

        {result.items.length ? (
          <>
            <ProductGrid products={result.items} priorityCount={4} showDepartment={showDepartment} className="mt-8 xl:grid-cols-3 2xl:grid-cols-4" animate />
            <Pagination
              className="mt-14"
              page={result.page}
              pageCount={result.pageCount}
              hrefFor={(p) => withParams(path, searchParams, { page: p === 1 ? null : String(p) })}
            />
          </>
        ) : filtered ? (
          <EmptyState title="Nothing matches these filters" actions={<LinkButton href={withParams(path, {}, keep)} variant="secondary">Clear filters</LinkButton>}>
            Try removing a filter or two to see more pieces.
          </EmptyState>
        ) : (
          <EmptyState
            title={emptyMessage?.title ?? "New pieces are on their way"}
            actions={
              <>
                <LinkButton href="/collections" variant="secondary">
                  Explore the collections
                </LinkButton>
                <LinkButton href="/shop">Shop all</LinkButton>
              </>
            }
          >
            {emptyMessage?.body ?? "There’s nothing here just yet."}
          </EmptyState>
        )}
      </div>
    </div>
  );
}
