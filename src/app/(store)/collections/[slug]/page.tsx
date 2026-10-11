import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs, Thread } from "@/components/ui/primitives";
import { Listing } from "@/components/store/listing";
import { ArchReveal, SplitWords } from "@/components/motion/primitives";
import { JsonLd } from "@/components/store/json-ld";
import { getCollection } from "@/server/catalog";
import { hasActiveFilters } from "@/lib/listing-params";
import { siteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const c = await getCollection(slug);
  if (!c) return { title: "Not found" };
  return {
    title: c.seoTitle ?? c.name,
    description: c.seoDescription ?? c.description ?? `Explore ${c.name} from Babajan Sumangali.`,
    alternates: { canonical: `/collections/${c.slug}` },
    openGraph: c.imageUrl ? { images: [{ url: c.imageUrl }] } : undefined,
    robots: hasActiveFilters(sp) || sp.page ? { index: false, follow: true } : undefined,
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const c = await getCollection(slug);
  if (!c) notFound();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
            { "@type": "ListItem", position: 2, name: "Collections", item: `${siteUrl()}/collections` },
            { "@type": "ListItem", position: 3, name: c.name, item: `${siteUrl()}/collections/${c.slug}` },
          ],
        }}
      />
      <section className="border-b border-mist bg-white">
        <div className="container-bs grid items-center gap-10 py-10 md:grid-cols-[1fr_auto] lg:py-16">
          <div className="max-w-2xl">
            <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Collections", href: "/collections" }, { name: c.name }]} />
            <p className="t-eyebrow mt-6">Collection</p>
            <SplitWords as="h1" text={c.name} className="t-page mt-3" onView={false} />
            {c.tagline ? <p className="mt-3 font-display text-2xl italic text-navy">{c.tagline}</p> : null}
            {c.description ? (
              <>
                <Thread className="my-6 max-w-32" />
                <p className="text-[1.0625rem] leading-relaxed text-charcoal">{c.description}</p>
              </>
            ) : null}
          </div>
          {c.imageUrl ? (
            <ArchReveal className="hidden aspect-[3/4] w-56 bg-soft md:block lg:w-72">
              <Image src={c.imageUrl} alt={c.imageAlt ?? ""} fill sizes="288px" className="object-cover" priority />
            </ArchReveal>
          ) : null}
        </div>
      </section>
      <div className="container-bs py-10">
        <Listing path={`/collections/${c.slug}`} scope={{ collectionSlug: c.slug }} searchParams={await searchParams} showDepartment />
      </div>
    </>
  );
}
