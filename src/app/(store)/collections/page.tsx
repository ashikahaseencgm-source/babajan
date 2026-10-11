import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs, EmptyState } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { PlaceholderArt } from "@/components/store/product-media";
import { getCollections } from "@/server/catalog";
import { ArchReveal } from "@/components/motion/primitives";

export const metadata: Metadata = {
  title: "Collections",
  description: "Explore curated edits from Babajan Sumangali — styles for celebrations, occasions, and everyday expression.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  const collections = (await getCollections()).filter((c) => c.productCount > 0);
  return (
    <>
      <section className="border-b border-mist bg-white">
        <div className="container-bs py-10 lg:py-14">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Collections" }]} />
          <h1 className="t-page mt-5">Collections</h1>
          <p className="mt-3 max-w-xl text-[1.0625rem] text-slate">Thoughtfully styled edits for the moments you want to remember.</p>
        </div>
      </section>
      <div className="container-bs py-12">
        {collections.length ? (
          <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {collections.map((c, i) => (
              <li key={c.id}>
                <article className="group relative">
                  <ArchReveal className="aspect-[4/5] bg-soft/50" delay={(i % 3) * 0.12}>
                    {c.imageUrl ? (
                      <Image src={c.imageUrl} alt={c.imageAlt ?? ""} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw" priority={i < 3} className="object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
                    ) : (
                      <PlaceholderArt name={c.name} colourHex={i % 2 ? "#0F2D4F" : "#1E5A9B"} compact />
                    )}
                  </ArchReveal>
                  <h2 className="t-card mt-5">
                    <Link href={`/collections/${c.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-has-[a:focus-visible]:underline">
                      {c.name}
                    </Link>
                  </h2>
                  {c.tagline ? <p className="mt-1.5 text-slate">{c.tagline}</p> : null}
                  <p className="t-meta mt-2">{c.productCount === 1 ? "1 piece" : `${c.productCount} pieces`}</p>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Collections are being curated" actions={<LinkButton href="/shop">Shop all</LinkButton>}>
            New edits will appear here soon.
          </EmptyState>
        )}
      </div>
    </>
  );
}
