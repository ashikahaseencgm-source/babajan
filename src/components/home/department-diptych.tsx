"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { ArchReveal, ChapterMark, Reveal } from "@/components/motion/primitives";

type Dept = {
  key: "women" | "men";
  href: string;
  headline: string;
  body: string;
  imageUrl: string | null;
  imageAlt: string;
  categories: { slug: string; name: string }[];
};

/**
 * "For her, for him" — two equal arches. Oversized script words drift in
 * opposite directions behind them as the section scrolls past.
 */
export function DepartmentDiptych({ women, men }: { women: Dept; men: Dept }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const driftA = useTransform(scrollYProgress, [0, 1], ["-8%", "12%"]);
  const driftB = useTransform(scrollYProgress, [0, 1], ["10%", "-10%"]);

  return (
    <section ref={ref} aria-labelledby="dept-title" className="relative overflow-hidden py-20 lg:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-[18vh] select-none">
        <motion.span style={reduce ? undefined : { x: driftA }} className="whitespace-nowrap font-display text-[22vw] italic leading-none text-navy/[0.045]">
          Women · Women
        </motion.span>
        <motion.span style={reduce ? undefined : { x: driftB }} className="whitespace-nowrap text-right font-display text-[22vw] italic leading-none text-navy/[0.045]">
          Men · Men · Men
        </motion.span>
      </div>

      <div className="container-bs relative">
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex justify-center">
            <ChapterMark index="II" label="For her, for him" />
          </div>
          <Reveal>
            <h2 id="dept-title" className="t-page mt-5">
              Two wardrobes, one story
            </h2>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-14 md:grid-cols-2 md:gap-10 lg:mt-20 lg:gap-20">
          {[women, men].map((d, i) => (
            <DeptPanel key={d.key} d={d} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function DeptPanel({ d, index }: { d: Dept; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const offset = index === 1 ? "md:mt-24" : "";

  return (
    <div ref={ref} className={`group relative ${offset}`}>
      <ArchReveal className="aspect-[4/5] bg-soft" delay={index * 0.15}>
        {d.imageUrl ? (
          <motion.div className="absolute inset-[-10%_0]" style={reduce ? undefined : { y: imgY }}>
            <Image src={d.imageUrl} alt={d.imageAlt} fill sizes="(min-width: 768px) 42vw, 92vw" className="object-cover transition-transform duration-[1.6s] ease-[var(--ease-quiet)] group-hover:scale-[1.04]" />
          </motion.div>
        ) : (
          <div className="absolute inset-0 bg-navy" />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy/55 via-transparent to-transparent" />
        <p aria-hidden="true" className="absolute bottom-6 left-0 right-0 text-center font-display text-5xl italic text-white lg:text-6xl">
          {d.headline}
        </p>
      </ArchReveal>
      <Reveal delay={0.2} className="mt-8 text-center">
        <h3 className="sr-only">
          <Link href={d.href}>{d.headline}</Link>
        </h3>
        <p className="mx-auto max-w-sm text-slate">{d.body}</p>
        {d.categories.length ? (
          <ul className="mt-5 flex flex-wrap justify-center gap-2" aria-label={`${d.headline} categories`}>
            {d.categories.slice(0, 4).map((c) => (
              <li key={c.slug}>
                <Link href={`${d.href}/${c.slug}`} className="inline-flex min-h-10 items-center rounded-sm border border-mist bg-white/70 px-3.5 text-[0.8125rem] text-navy transition-colors hover:border-navy hover:bg-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <Link href={d.href} className="group/cta mt-6 inline-flex min-h-11 items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-navy">
          Shop {d.headline}
          <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-1" strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </Reveal>
    </div>
  );
}
