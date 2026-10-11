"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { LinkButton } from "@/components/ui/button";
import { SplitWords, easeCinema } from "@/components/motion/primitives";
import type { Content } from "@/server/content";

/**
 * Opening scene. The section is taller than the viewport and its stage is
 * pinned, so scrolling plays a short "camera move": the copy lifts away, the
 * arch pushes in towards the viewer and the two figures drift apart.
 */
export function CinematicHero({ hero }: { hero: Content<"home.hero"> }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const copyY = useTransform(scrollYProgress, [0, 0.5], ["0%", "-35%"]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.42], [1, 0]);
  const archScale = useTransform(scrollYProgress, [0, 0.8], [1, 1.28]);
  const archY = useTransform(scrollYProgress, [0, 0.8], ["0%", "-6%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.08, 1.3]);
  const ringScale = useTransform(scrollYProgress, [0, 0.8], [1, 1.55]);
  const ringOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const leftX = useTransform(scrollYProgress, [0, 0.8], ["0%", "-60%"]);
  const rightX = useTransform(scrollYProgress, [0, 0.8], ["0%", "60%"]);
  const figureOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const veil = useTransform(scrollYProgress, [0.55, 0.95], [0, 1]);

  const [left, right] = hero.accents;
  const st = (v: object) => (reduce ? undefined : v);

  return (
    <section ref={ref} aria-labelledby="hero-title" className="relative lg:h-[175vh]">
      <div className="relative overflow-hidden lg:sticky lg:top-0 lg:h-svh">
        {/* soft textile wash */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,var(--bs-soft-blue),transparent_60%)] opacity-70" />

        <div className="container-bs relative grid h-full items-center gap-10 py-12 md:grid-cols-[1fr_1.05fr] md:py-16 lg:py-0">
          {/* Copy */}
          <motion.div className="relative z-10 max-w-xl" style={st({ y: copyY, opacity: copyOpacity })}>
            {hero.eyebrow ? (
              <motion.p
                className="t-eyebrow mb-6 flex items-center gap-3"
                initial={reduce ? false : { opacity: 0, letterSpacing: "0.5em" }}
                animate={{ opacity: 1, letterSpacing: "0.18em" }}
                transition={{ duration: 1.4, ease: easeCinema }}
              >
                <span className="font-display text-base normal-case italic tracking-normal text-navy">I</span>
                <span className="h-px w-8 bg-gold" aria-hidden="true" />
                {hero.eyebrow}
              </motion.p>
            ) : null}
            <SplitWords as="h1" id="hero-title" text={hero.headline} className="t-hero" onView={false} delay={0.25} stagger={0.12} />
            <motion.div
              aria-hidden="true"
              className="my-8 h-px max-w-40 origin-left bg-gold"
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.2, ease: easeCinema, delay: 0.9 }}
            />
            <motion.p
              className="max-w-md text-[1.0625rem] leading-relaxed text-charcoal/90"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: easeCinema, delay: 1.05 }}
            >
              {hero.body}
            </motion.p>
            <motion.div
              className="mt-10 flex flex-wrap gap-3"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: easeCinema, delay: 1.25 }}
            >
              <LinkButton href={hero.primaryHref} size="lg">
                {hero.primaryLabel}
              </LinkButton>
              {hero.secondaryLabel && hero.secondaryHref ? (
                <LinkButton href={hero.secondaryHref} variant="secondary" size="lg">
                  {hero.secondaryLabel}
                </LinkButton>
              ) : null}
            </motion.div>
          </motion.div>

          {/* Stage */}
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[34rem] md:mr-[6%] lg:h-[min(76svh,46rem)] lg:w-auto lg:max-w-none">
            {/* Outer gold ring arch */}
            <motion.div
              aria-hidden="true"
              className="arch absolute inset-x-[2%] bottom-0 top-[-3%] border border-gold/80"
              style={st({ scale: ringScale, opacity: ringOpacity, transformOrigin: "50% 100%" })}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.6, delay: 0.6 }}
            />
            <motion.div
              aria-hidden="true"
              className="absolute left-1/2 top-[-4.4%] size-3 -translate-x-1/2 rotate-45 border border-gold bg-ivory"
              style={st({ opacity: ringOpacity })}
            />

            {/* Main arch with campaign image: rises like a curtain on load */}
            <motion.div
              className="arch absolute inset-x-[9%] bottom-0 top-[5%] bg-soft"
              style={st({ scale: archScale, y: archY, transformOrigin: "50% 100%" })}
              initial={reduce ? false : { clipPath: "inset(100% 0% 0% 0%)" }}
              animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
              transition={{ duration: 1.6, ease: easeCinema, delay: 0.15 }}
            >
              {hero.imageUrl ? (
                <motion.div className="absolute inset-0" style={st({ scale: imageScale })}>
                  <Image src={hero.imageUrl} alt={hero.imageAlt} fill priority sizes="(min-width: 768px) 46vw, 92vw" className="object-cover" quality={85} />
                </motion.div>
              ) : (
                <div className="absolute inset-0 bg-navy" />
              )}
              <motion.div aria-hidden="true" className="absolute inset-0 bg-navy" style={st({ opacity: veil })} />
            </motion.div>

            {/* Floating cut-out figures (light backdrops blend into the ivory page) */}
            {left ? (
              <motion.div
                className="absolute -left-[16%] bottom-0 hidden w-[34%] mix-blend-multiply lg:block"
                style={st({ x: leftX, opacity: figureOpacity })}
                initial={reduce ? false : { opacity: 0, x: "-30%" }}
                animate={{ opacity: 1, x: "0%" }}
                transition={{ duration: 1.4, ease: easeCinema, delay: 0.8 }}
              >
                <div className="relative aspect-[2/3] [mask-image:radial-gradient(ellipse_62%_78%_at_50%_46%,black_58%,transparent_100%)]">
                  <Image src={left.url} alt={left.alt} fill sizes="14vw" className="object-cover object-top" />
                </div>
              </motion.div>
            ) : null}
            {right ? (
              <motion.div
                className="absolute -right-[12%] bottom-0 hidden w-[32%] mix-blend-multiply lg:block"
                style={st({ x: rightX, opacity: figureOpacity })}
                initial={reduce ? false : { opacity: 0, x: "30%" }}
                animate={{ opacity: 1, x: "0%" }}
                transition={{ duration: 1.4, ease: easeCinema, delay: 0.95 }}
              >
                <div className="relative aspect-[2/3] [mask-image:radial-gradient(ellipse_62%_78%_at_50%_46%,black_58%,transparent_100%)]">
                  <Image src={right.url} alt={right.alt} fill sizes="14vw" className="object-cover object-top" />
                </div>
              </motion.div>
            ) : null}

            <div aria-hidden="true" className="absolute inset-x-[-4%] bottom-0 h-px bg-gold" />
          </div>
        </div>

        {/* Scroll cue */}
        {!reduce ? (
          <motion.div
            aria-hidden="true"
            className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.625rem] font-semibold uppercase tracking-[0.3em] text-slate lg:flex"
            style={{ opacity: copyOpacity }}
          >
            Scroll
            <motion.span className="block h-10 w-px origin-top bg-navy/50" animate={{ scaleY: [0, 1, 0], y: [0, 0, 20] }} transition={{ duration: 2.2, repeat: 2, ease: "easeInOut" }} />
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
