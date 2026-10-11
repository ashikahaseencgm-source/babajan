import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/primitives";
import { ArchReveal, Reveal, SplitWords } from "@/components/motion/primitives";
import { Listing } from "./listing";
import { JsonLd } from "./json-ld";
import { getCategories } from "@/server/catalog";
import { getContent } from "@/server/content";
import { siteUrl } from "@/lib/site";
import type { RawSearchParams } from "@/lib/listing-params";

/** Women and Men landing pages share one template so both receive identical care. */
export async function DepartmentPage({ department, searchParams }: { department: "women" | "men"; searchParams: RawSearchParams }) {
  const [content, categories] = await Promise.all([getContent(`department.${department}`), getCategories(department)]);
  const label = department === "women" ? "Women" : "Men";
  const visible = categories.filter((c) => c.productCount > 0);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
            { "@type": "ListItem", position: 2, name: label, item: `${siteUrl()}/${department}` },
          ],
        }}
      />
      <section className="border-b border-mist bg-white">
        <div className="container-bs grid items-end gap-8 py-10 md:grid-cols-[1fr_auto] lg:py-14">
          <div>
            <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: label }]} />
            <SplitWords as="h1" text={content.headline} className="t-hero mt-5" onView={false} />
            <Reveal delay={0.3}>
              <p className="mt-4 max-w-xl text-[1.0625rem] text-slate">{content.body}</p>
            </Reveal>
          </div>
          {content.imageUrl ? (
            <ArchReveal className="hidden aspect-[3/4] w-52 bg-soft md:block lg:w-64">
              <Image src={content.imageUrl} alt={content.imageAlt} fill sizes="256px" className="object-cover" priority />
            </ArchReveal>
          ) : null}
        </div>
        {visible.length ? (
          <nav aria-label={`${label} categories`} className="container-bs pb-6">
            <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <li>
                <span aria-current="page" className="inline-flex min-h-10 items-center whitespace-nowrap rounded-sm bg-navy px-4 text-[0.8125rem] font-medium text-white">
                  All {label.toLowerCase()}
                </span>
              </li>
              {visible.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/${department}/${c.slug}`}
                    className="inline-flex min-h-10 items-center whitespace-nowrap rounded-sm border border-mist bg-white px-4 text-[0.8125rem] text-navy hover:border-navy"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </section>
      <div className="container-bs py-10">
        <Listing path={`/${department}`} scope={{ department }} searchParams={searchParams} />
      </div>
    </>
  );
}
