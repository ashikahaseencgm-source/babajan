"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { ChapterMark } from "@/components/motion/primitives";
import { PlaceholderArt } from "@/components/store/product-media";
import { formatMoney } from "@/lib/money";
import type { ProductCardData } from "@/server/catalog";

/**
 * The featured edit as a film strip. On large screens the section pins and
 * vertical scrolling moves the strip sideways, frame by frame. On small
 * screens (or with reduced motion) it is a native swipeable row.
 */
export function FilmStrip({
  title,
  tagline,
  href,
  products,
  index = "III",
}: {
  title: string;
  tagline: string | null;
  href: string;
  products: ProductCardData[];
  index?: string;
}) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [distance, setDistance] = useState(0);
  const [pinned, setPinned] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const lg = window.matchMedia("(min-width: 1024px)").matches;
      setPinned(lg && !reduce);
      if (track.current) setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [reduce]);

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  const bar = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section ref={section} aria-labelledby="strip-title" className="relative" style={pinned ? { height: `calc(100svh + ${distance}px)` } : undefined}>
      <div className={pinned ? "sticky top-0 flex h-svh flex-col justify-center overflow-hidden" : "py-16"}>
        <motion.div
          ref={track}
          className={pinned ? "flex w-max items-stretch gap-8 pl-[max(2.5rem,calc((100vw-88rem)/2+2.5rem))] pr-[10vw]" : "flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-4 sm:scroll-px-6 sm:px-6"}
          style={pinned ? { x } : undefined}
        >
          {/* Title card */}
          <div className="flex w-[78vw] shrink-0 snap-start flex-col justify-center sm:w-[24rem] lg:w-[28rem]">
            <ChapterMark index={index} label="The featured edit" />
            <h2 id="strip-title" className="t-page mt-5">
              {title}
            </h2>
            {tagline ? <p className="mt-4 max-w-sm text-[1.0625rem] text-slate">{tagline}</p> : null}
            <Link href={href} className="group mt-8 inline-flex min-h-11 items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-navy">
              View the edit
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} aria-hidden="true" />
            </Link>
            {pinned ? (
              <div className="mt-10 h-px w-40 bg-mist" aria-hidden="true">
                <motion.div className="h-px bg-navy" style={{ width: bar }} />
              </div>
            ) : null}
          </div>

          {products.map((p, i) => (
            <Frame key={p.id} p={p} i={i} />
          ))}

          <Link
            href={href}
            className="group flex w-[60vw] shrink-0 snap-start flex-col items-center justify-center gap-4 rounded-xs border border-gold/60 text-center sm:w-[18rem] lg:w-[20rem]"
          >
            <span className="font-display text-3xl italic text-navy">See every piece</span>
            <ArrowRight className="size-5 text-navy transition-transform group-hover:translate-x-1" strokeWidth={1.25} aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function Frame({ p, i }: { p: ProductCardData; i: number }) {
  const lift = i % 2 === 1;
  return (
    <article className={`group relative w-[66vw] shrink-0 snap-start sm:w-[20rem] lg:w-[24rem] ${lift ? "lg:mt-28" : "lg:mt-4"}`}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-xs bg-ivory">
        {p.image ? (
          <Image src={p.image.url} alt={p.image.alt} fill sizes="(min-width: 1024px) 24rem, 66vw" className="object-cover mix-blend-multiply transition-transform duration-[1.2s] ease-[var(--ease-quiet)] group-hover:scale-[1.05]" />
        ) : (
          <PlaceholderArt name={p.name} colourHex={p.colourHex} colourName={p.colourName} />
        )}
        <span aria-hidden="true" className="absolute left-3 top-3 font-display text-sm italic text-navy/70">
          {String(i + 1).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h3 className="text-[0.9375rem] font-medium text-charcoal">
          <Link href={`/products/${p.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-has-[a:focus-visible]:underline">
            {p.name}
          </Link>
        </h3>
        <p className="text-sm font-semibold tabular-nums text-navy">{formatMoney(p.price)}</p>
      </div>
      <p className="mt-0.5 text-[0.8125rem] text-slate">{p.colourName}</p>
    </article>
  );
}
