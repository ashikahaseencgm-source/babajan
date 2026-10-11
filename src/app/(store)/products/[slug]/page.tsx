import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, Badge, SectionHeading, Thread } from "@/components/ui/primitives";
import { Gallery } from "@/components/store/gallery";
import { PurchasePanel } from "@/components/store/purchase-panel";
import { Price } from "@/components/store/price";
import { ProductGrid } from "@/components/store/product-card";
import { JsonLd } from "@/components/store/json-ld";
import { getProductBySlug, relatedProducts } from "@/server/catalog";
import { getSettings } from "@/server/settings";
import { effectiveUnitPrice } from "@/server/domain/pricing";
import { siteUrl } from "@/lib/site";
import { formatMoney } from "@/lib/money";

type Props = { params: Promise<{ slug: string }> };

const deptLabel = { women: "Women", men: "Men", unisex: "Unisex" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: "Not found" };
  const description =
    p.seoDescription ??
    `${p.styleLine ? `${p.styleLine} ` : ""}Explore ${p.name} from Babajan Sumangali. Discover details, available sizes, and styling notes.`.slice(0, 160);
  return {
    title: p.seoTitle ?? p.name,
    description,
    alternates: { canonical: `/products/${p.slug}` },
    robots: p.status === "archived" ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      title: p.name,
      description,
      images: p.images[0] ? [{ url: p.images[0].url, width: p.images[0].width, height: p.images[0].height, alt: p.images[0].alt }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const [related, settings] = await Promise.all([relatedProducts(product), getSettings()]);

  const purchasable = product.status === "active";
  const variants = product.variants.map((v) => ({
    id: v.id,
    size: v.size,
    price: effectiveUnitPrice(product.price, v.priceOverride),
    stock: v.stockOnHand,
  }));
  const inStock = variants.some((v) => v.stock > 0);
  const deptHref = product.department === "unisex" ? "/shop" : `/${product.department}`;
  const crumbs = [
    { name: "Home", href: "/" },
    { name: deptLabel[product.department], href: deptHref },
    ...(product.category && product.department !== "unisex" ? [{ name: product.category.name, href: `${deptHref}/${product.category.slug}` }] : []),
    { name: product.name },
  ];

  const details: { title: string; body: string | null }[] = [
    { title: "Fabric & materials", body: product.materials },
    { title: "Fit & sizing", body: product.fit },
    { title: "Measurements", body: product.measurements },
    { title: "What's included", body: product.includedItems },
    { title: "Care", body: product.care },
  ];

  const shipping = settings.shipping.methods[0];
  const url = `${siteUrl()}/products/${product.slug}`;

  return (
    <>
      {purchasable ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            sku: product.styleCode,
            description: product.description ?? product.styleLine ?? undefined,
            image: product.images.map((i) => `${siteUrl()}${i.url}`),
            brand: { "@type": "Brand", name: "Babajan Sumangali" },
            color: product.colourName ?? undefined,
            url,
            offers: {
              "@type": "Offer",
              url,
              priceCurrency: product.currency,
              price: (product.price / 100).toFixed(2),
              availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/NewCondition",
            },
          }}
        />
      ) : null}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            ...(c.href ? { item: `${siteUrl()}${c.href === "/" ? "" : c.href}` } : {}),
          })),
        }}
      />

      <div className="container-bs pb-8 pt-6 lg:pt-8">
        <Breadcrumbs items={crumbs} />
      </div>

      <div className="container-bs grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
        <Gallery images={product.images} name={product.name} colourHex={product.colourHex} colourName={product.colourName} />

        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="t-eyebrow">
            {deptLabel[product.department]}
            {product.category ? ` · ${product.category.name}` : ""}
          </p>
          <h1 className="mt-3 font-display text-[2.125rem] font-medium leading-tight text-navy lg:text-[2.75rem]">{product.name}</h1>
          {product.styleLine ? <p className="mt-2 font-display text-xl italic text-navy/85">{product.styleLine}</p> : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Price price={product.price} compareAtPrice={product.compareAtPrice} currency={product.currency} size="lg" />
            {!inStock && purchasable ? <Badge tone="muted">Sold out</Badge> : null}
          </div>
          {settings.tax.confirmedByOwner && settings.tax.pricesIncludeTax ? (
            <p className="t-meta mt-1">Price includes applicable taxes.</p>
          ) : null}

          {product.colourName ? (
            <p className="mt-6 flex items-center gap-2 text-sm text-charcoal">
              <span className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-navy">Colour</span>
              <span className="size-4 rounded-full border border-black/15" style={{ background: product.colourHex ?? undefined }} aria-hidden="true" />
              {product.colourName}
            </p>
          ) : null}

          <Thread className="my-6" />

          <PurchasePanel variants={variants} basePrice={product.price} purchasable={purchasable} />

          <ul className="mt-8 space-y-2 border-t border-mist pt-6 text-sm text-charcoal">
            <li>
              <span className="font-semibold text-navy">Delivery: </span>
              {settings.shipping.confirmedByOwner && shipping ? (
                <>
                  {shipping.label}
                  {shipping.estimate ? `, ${shipping.estimate}` : ""}
                  {shipping.fee === 0 ? " — complimentary" : ` — ${formatMoney(shipping.fee)}`}
                  {shipping.freeAbove != null && shipping.fee > 0 ? ` (complimentary over ${formatMoney(shipping.freeAbove)})` : ""}.{" "}
                </>
              ) : (
                "Delivery charges are shown at checkout before you pay. "
              )}
              <Link href="/policies/shipping" className="link">
                Shipping details
              </Link>
            </li>
            <li>
              <span className="font-semibold text-navy">Returns: </span>
              <Link href="/policies/returns" className="link">
                Read our returns policy
              </Link>
            </li>
            <li>
              <span className="font-semibold text-navy">Questions? </span>
              <Link href={`/contact?topic=product&product=${encodeURIComponent(product.styleCode)}`} className="link">
                Contact our team
              </Link>
            </li>
          </ul>

          <p className="t-meta mt-6">Style code: {product.styleCode}</p>
          {product.isSample ? (
            <p className="mt-2 text-[0.8125rem] text-slate">This is a sample listing for demonstration — it is not a real product.</p>
          ) : null}
        </div>
      </div>

      {/* Description & details */}
      <section className="container-bs mt-16 grid gap-10 border-t border-mist pt-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16" aria-labelledby="about-piece">
        <div>
          <h2 id="about-piece" className="t-section">
            About this piece
          </h2>
          {product.description ? (
            <div className="prose-bs mt-5 text-charcoal">
              {product.description.split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-slate">A full description will be added soon.</p>
          )}
          {product.occasions.length ? (
            <p className="mt-6 text-sm">
              <span className="font-semibold text-navy">Occasions: </span>
              {product.occasions.join(", ")}
            </p>
          ) : null}
        </div>
        <div className="divide-y divide-mist border-y border-mist">
          {details
            .filter((d) => d.body)
            .map((d, i) => (
              <details key={d.title} className="group" open={i === 0}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-navy [&::-webkit-details-marker]:hidden">
                  {d.title}
                  <span className="text-xl font-light transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <div className="whitespace-pre-line pb-5 text-[0.9375rem] leading-relaxed text-charcoal">{d.body}</div>
              </details>
            ))}
          {details.every((d) => !d.body) ? <p className="py-5 text-sm text-slate">Fabric, fit and care details will be added soon. Please contact us with any questions.</p> : null}
        </div>
      </section>

      {related.length ? (
        <section className="container-bs mt-20" aria-labelledby="related-title">
          <SectionHeading id="related-title" title="You may also like" description="Pieces from the same category and collections." />
          <ProductGrid products={related} className="mt-8 xl:grid-cols-4" />
        </section>
      ) : null}
    </>
  );
}
