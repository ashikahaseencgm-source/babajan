import Link from "next/link";
import { ProductGrid } from "@/components/store/product-card";
import { Emblem } from "@/components/store/logo";
import { JsonLd } from "@/components/store/json-ld";
import { CinematicHero } from "@/components/home/cinematic-hero";
import { DepartmentDiptych } from "@/components/home/department-diptych";
import { ScrollMarquee } from "@/components/home/scroll-marquee";
import { FilmStrip } from "@/components/home/film-strip";
import { ChapterScene } from "@/components/home/chapter-scene";
import { ChapterMark, DrawThread, Reveal, ScrollThread, ScrollWords } from "@/components/motion/primitives";
import { getContent } from "@/server/content";
import { collectionProducts, getCategories, getCollection, getCollections, newestProducts } from "@/server/catalog";
import { siteUrl } from "@/lib/site";

export default async function HomePage() {
  const [hero, story, featuredCfg, womenContent, menContent, womenCats, menCats, newest, featuredCollections] = await Promise.all([
    getContent("home.hero"),
    getContent("home.story"),
    getContent("home.featured"),
    getContent("department.women"),
    getContent("department.men"),
    getCategories("women"),
    getCategories("men"),
    newestProducts(8),
    getCollections({ featuredOnly: true }),
  ]);

  const featured = (featuredCfg.collectionSlug ? await getCollection(featuredCfg.collectionSlug) : null) ?? featuredCollections[0] ?? null;
  const featuredItems = featured ? await collectionProducts(featured.id, 8) : [];
  const occasion = featuredCfg.occasionCollectionSlug
    ? await getCollection(featuredCfg.occasionCollectionSlug)
    : (featuredCollections.find((c) => c.id !== featured?.id) ?? null);

  const cats = (list: typeof womenCats) => list.filter((c) => c.productCount > 0).map(({ slug, name }) => ({ slug, name }));

  return (
    <>
      <ScrollThread />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Babajan Sumangali",
          url: siteUrl(),
          logo: `${siteUrl()}/brand/wordmark-960.png`,
        }}
      />

      {/* I — Opening scene */}
      <CinematicHero hero={hero} />

      <ScrollMarquee words={["Modern tradition", "Personal expression", "Considered elegance", "Wear your story"]} />

      {/* II — Women & Men, equal billing */}
      <DepartmentDiptych
        women={{ key: "women", href: "/women", ...womenContent, categories: cats(womenCats) }}
        men={{ key: "men", href: "/men", ...menContent, categories: cats(menCats) }}
      />

      {/* III — Featured edit as a film strip */}
      {featured && featuredItems.length ? (
        <FilmStrip title={featured.name} tagline={featured.tagline ?? featured.description} href={`/collections/${featured.slug}`} products={featuredItems} />
      ) : null}

      {/* IV — Occasion chapter */}
      {occasion ? (
        <ChapterScene
          index="IV"
          label="For the moments worth celebrating"
          title={occasion.name}
          body={occasion.description}
          href={`/collections/${occasion.slug}`}
          cta={`Explore ${occasion.name}`}
          imageUrl={occasion.imageUrl}
          imageAlt={occasion.imageAlt ?? ""}
        />
      ) : null}

      {/* V — New arrivals */}
      {newest.length ? (
        <section aria-labelledby="new-title" className="container-bs py-20 lg:py-32">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <ChapterMark index="V" label="Just in" />
              <Reveal>
                <h2 id="new-title" className="t-page mt-5">
                  New arrivals
                </h2>
                <p className="mt-3 text-slate">Meet the latest additions to the collection.</p>
              </Reveal>
            </div>
            <Link href="/new-arrivals" className="link inline-flex min-h-11 items-center text-sm">
              See all new arrivals
            </Link>
          </div>
          <ProductGrid products={newest} className="mt-12" showDepartment animate />
        </section>
      ) : null}

      {/* VI — Brand story */}
      <section aria-labelledby="story-title" className="relative overflow-hidden py-24 lg:py-36">
        <div className="container-bs">
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <Emblem size={64} className="mx-auto mb-8 w-16" />
            </Reveal>
            <div className="flex justify-center">
              <ChapterMark index="VI" label={story.eyebrow || "Our story"} />
            </div>
            <Reveal>
              <h2 id="story-title" className="t-page mt-5">
                {story.headline}
              </h2>
            </Reveal>
            <DrawThread className="mx-auto my-10 max-w-56" />
            <ScrollWords text={story.body} className="mx-auto max-w-3xl font-display text-[1.625rem] leading-[1.45] text-navy lg:text-[2.25rem]" />
            {story.linkLabel && story.linkHref ? (
              <Reveal delay={0.1}>
                <Link href={story.linkHref} className="link mt-10 inline-flex min-h-11 items-center text-sm">
                  {story.linkLabel}
                </Link>
              </Reveal>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
