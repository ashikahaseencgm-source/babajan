import Link from "next/link";
import { Price } from "./price";
import { ProductMedia } from "./product-media";
import { Badge } from "@/components/ui/primitives";
import { isValidSale } from "@/server/domain/pricing";
import { cn } from "@/lib/cn";
import { Reveal } from "@/components/motion/primitives";
import type { ProductCardData } from "@/server/catalog";

const deptLabel = { women: "Women", men: "Men", unisex: "Unisex" } as const;

export function ProductCard({ product, priority, showDepartment }: { product: ProductCardData; priority?: boolean; showDepartment?: boolean }) {
  const sale = isValidSale(product.price, product.compareAtPrice);
  return (
    <article className="group relative flex flex-col">
      <div className="relative">
        <ProductMedia
          image={product.image}
          name={product.name}
          colourHex={product.colourHex}
          colourName={product.colourName}
          priority={priority}
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
          className="rounded-xs"
        />
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {!product.inStock ? <Badge tone="muted">Sold out</Badge> : null}
          {sale && product.inStock ? <Badge tone="sale">Sale</Badge> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-1 px-0.5">
        <p className="text-[0.75rem] uppercase tracking-[0.12em] text-slate">
          {showDepartment ? `${deptLabel[product.department]} · ` : null}
          {product.categoryName ?? deptLabel[product.department]}
        </p>
        <h3 className="text-[0.9375rem] font-medium leading-snug text-charcoal">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-has-[a:focus-visible]:underline">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <Price price={product.price} compareAtPrice={product.compareAtPrice} currency={product.currency} size="sm" />
          {product.colourName ? (
            <span className="flex items-center gap-1.5 text-[0.75rem] text-slate">
              <span className="size-3 rounded-full border border-black/10" style={{ background: product.colourHex ?? undefined }} aria-hidden="true" />
              {product.colourName}
            </span>
          ) : null}
        </div>
      </div>
      <div className={cn("pointer-events-none absolute inset-0 rounded-xs ring-blue ring-offset-4 ring-offset-ivory group-has-[a:focus-visible]:ring-2")} aria-hidden="true" />
    </article>
  );
}

export function ProductGrid({
  products,
  priorityCount = 0,
  showDepartment,
  className,
  animate,
}: {
  products: ProductCardData[];
  priorityCount?: number;
  showDepartment?: boolean;
  className?: string;
  /** Staggered rise-in as cards enter the viewport (editorial pages only). */
  animate?: boolean;
}) {
  return (
    <ul className={cn("grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4", className)} role="list">
      {products.map((p, i) =>
        animate ? (
          <Reveal key={p.id} as="li" className="relative" delay={(i % 4) * 0.08} y={40}>
            <ProductCard product={p} priority={i < priorityCount} showDepartment={showDepartment} />
          </Reveal>
        ) : (
          <li key={p.id} className="relative">
            <ProductCard product={p} priority={i < priorityCount} showDepartment={showDepartment} />
          </li>
        ),
      )}
    </ul>
  );
}
