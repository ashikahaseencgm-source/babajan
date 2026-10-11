"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { LinkButton } from "@/components/ui/button";
import { ChapterMark, SplitWords, easeCinema } from "@/components/motion/primitives";

/**
 * Full-bleed "chapter" scene: the photograph slowly zooms and drifts as the
 * section passes, while a navy veil keeps the white copy legible
 * (copy sits on ≥ 80% navy, well above WCAG AA).
 */
export function ChapterScene({
  index,
  label,
  title,
  body,
  href,
  cta,
  imageUrl,
  imageAlt,
}: {
  index: string;
  label: string;
  title: string;
  body: string | null;
  href: string;
  cta: string;
  imageUrl: string | null;
  imageAlt: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.25, 1]);
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);
  const thread = useTransform(scrollYProgress, [0.2, 0.6], [0, 1]);

  return (
    <section ref={ref} aria-labelledby={`chapter-${index}`} className="on-dark relative overflow-hidden bg-navy">
      <div className="grid min-h-[90svh] lg:grid-cols-2">
        <div className="relative min-h-[60svh] overflow-hidden lg:min-h-0">
          {imageUrl ? (
            <motion.div className="absolute inset-0" style={reduce ? undefined : { scale, y }}>
              <Image src={imageUrl} alt={imageAlt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </motion.div>
          ) : null}
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy via-navy/10 to-transparent lg:bg-gradient-to-l lg:from-navy lg:via-navy/5" />
        </div>

        <div className="relative flex items-center px-6 py-16 sm:px-10 lg:px-16 xl:px-24">
          <div className="max-w-xl">
            <ChapterMark index={index} label={label} tone="dark" />
            <SplitWords as="h2" id={`chapter-${index}`} text={title} className="mt-6 font-display text-[clamp(2.5rem,1.6rem+3.6vw,5rem)] font-medium leading-[1.02] text-ivory" />
            <svg aria-hidden="true" viewBox="0 0 400 12" className="my-8 h-3 w-64 text-gold" fill="none">
              <motion.path d="M0 6 H180 L190 1 L200 6 L190 11 L180 6 M200 6 H400" stroke="currentColor" strokeWidth="1" style={reduce ? undefined : { pathLength: thread }} />
            </svg>
            {body ? (
              <motion.p
                className="text-[1.0625rem] leading-relaxed text-ivory/90"
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: easeCinema, delay: 0.3 }}
              >
                {body}
              </motion.p>
            ) : null}
            <LinkButton href={href} variant="inverse" size="lg" className="mt-10">
              {cta}
            </LinkButton>
          </div>
        </div>
      </div>
    </section>
  );
}
