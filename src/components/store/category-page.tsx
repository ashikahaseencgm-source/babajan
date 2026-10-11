import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/primitives";
import { Listing } from "./listing";
import { JsonLd } from "./json-ld";
import { getCategory } from "@/server/catalog";
import { siteUrl } from "@/lib/site";
import { hasActiveFilters, type RawSearchParams } from "@/lib/listing-params";

const labels = { women: "Women", men: "Men" } as const;

export async function categoryMetadata(department: "women" | "men", slug: string, sp: RawSearchParams): Promise<Metadata> {
  const c = await getCategory(department, slug);
  if (!c) return { title: "Not found" };
  const title = `${labels[department]}'s ${c.name}`;
  return {
    title,
    description: c.description ?? `Explore ${labels[department].toLowerCase()}'s ${c.name.toLowerCase()} from Babajan Sumangali. Discover details, available sizes, and styles for every occasion.`,
    alternates: { canonical: `/${department}/${c.slug}` },
    robots: hasActiveFilters(sp) || sp.page ? { index: false, follow: true } : undefined,
  };
}

export async function CategoryPage({ department, slug, searchParams }: { department: "women" | "men"; slug: string; searchParams: RawSearchParams }) {
  const c = await getCategory(department, slug);
  if (!c) notFound();
  const label = labels[department];
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
            { "@type": "ListItem", position: 2, name: label, item: `${siteUrl()}/${department}` },
            { "@type": "ListItem", position: 3, name: c.name, item: `${siteUrl()}/${department}/${c.slug}` },
          ],
        }}
      />
      <section className="border-b border-mist bg-white">
        <div className="container-bs py-10 lg:py-14">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: label, href: `/${department}` }, { name: c.name }]} />
          <h1 className="t-page mt-5">{c.name}</h1>
          {c.description ? <p className="mt-3 max-w-xl text-[1.0625rem] text-slate">{c.description}</p> : null}
        </div>
      </section>
      <div className="container-bs py-10">
        <Listing path={`/${department}/${c.slug}`} scope={{ department, categorySlug: c.slug }} searchParams={searchParams} hideCategoryFilter />
      </div>
    </>
  );
}
