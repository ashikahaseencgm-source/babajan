"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Motion vocabulary for the editorial storefront. Every primitive renders a
 * fully static, readable result when the visitor prefers reduced motion.
 * Motion is decorative only — content and controls never wait on it.
 */

export const easeCinema = [0.22, 1, 0.36, 1] as const;

/** Fade-and-rise when scrolled into view. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "section" | "p";
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  if (reduce) return <Comp className={className}>{children}</Comp>;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.9, ease: easeCinema, delay }}
    >
      {children}
    </Comp>
  );
}

/** Headline whose words rise out of a mask, one after another. */
export function SplitWords({
  text,
  className,
  delay = 0,
  stagger = 0.08,
  as = "h2",
  id,
  onView = true,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  as?: "h1" | "h2" | "h3" | "p";
  id?: string;
  onView?: boolean;
}) {
  const reduce = useReducedMotion();
  const Tag = as;
  const words = text.split(" ");
  if (reduce) {
    return (
      <Tag id={id} className={className}>
        {text}
      </Tag>
    );
  }
  const animateProps = onView
    ? { whileInView: "show" as const, viewport: { once: true, margin: "0px 0px -10% 0px" } }
    : { animate: "show" as const };
  return (
    <Tag id={id} className={className} aria-label={text}>
      <motion.span aria-hidden="true" initial="hide" {...animateProps} transition={{ staggerChildren: stagger, delayChildren: delay }} className="inline">
        {words.map((w, i) => (
          <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
            <motion.span
              className="inline-block will-change-transform"
              variants={{ hide: { y: "110%", rotate: 4 }, show: { y: "0%", rotate: 0, transition: { duration: 1, ease: easeCinema } } }}
            >
              {w}
              {i < words.length - 1 ? " " : ""}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

/** Paragraph that "develops" word by word as it scrolls through the viewport. */
export function ScrollWords({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = text.split(" ");
  if (reduce) return <p className={className}>{text}</p>;
  return (
    <p ref={ref} className={className} aria-label={text}>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <Word key={`${w}-${i}`} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
            {w}
          </Word>
        ))}
      </span>
    </p>
  );
}

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <>
      <motion.span style={{ opacity }}>{children}</motion.span>{" "}
    </>
  );
}

/** Vertical parallax for an image or layer (percent of its own height). */
export function Parallax({ children, amount = 12, className }: { children: ReactNode; amount?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${amount}%`, `${amount}%`]);
  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <motion.div className="absolute inset-[-14%_0]" style={reduce ? undefined : { y }}>
        {children}
      </motion.div>
    </div>
  );
}

/** Arch-shaped window that "rises like a curtain" when it enters the viewport. */
export function ArchReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={cn("arch relative", className)}>{children}</div>;
  return (
    <motion.div
      className={cn("arch relative", className)}
      initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 1.4, ease: easeCinema, delay }}
    >
      {children}
    </motion.div>
  );
}

/** A fine gold thread that draws itself across as it comes into view. */
export function DrawThread({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("flex items-center gap-3 text-gold", className)} aria-hidden="true">
      <motion.span
        className="h-px flex-1 origin-right bg-current"
        initial={reduce ? false : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: easeCinema }}
      />
      <motion.span
        className="size-[7px] rotate-45 border border-current"
        initial={reduce ? false : { scale: 0, rotate: 0 }}
        whileInView={{ scale: 1, rotate: 45 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: easeCinema, delay: 0.5 }}
      />
      <motion.span
        className="h-px flex-1 origin-left bg-current"
        initial={reduce ? false : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: easeCinema }}
      />
    </div>
  );
}

/** Page-level reading progress: a gold thread under the header. */
export function ScrollThread() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  if (reduce) return null;
  return <motion.div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-gold" style={{ scaleX }} />;
}

/** "Chapter" label used to give the homepage a filmic sequence. */
export function ChapterMark({ index, label, tone = "light" }: { index: string; label: string; tone?: "light" | "dark" }) {
  return (
    <Reveal y={12} className={cn("flex items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.28em]", tone === "dark" ? "text-gold" : "text-blue")}>
      <span className="font-display text-base normal-case italic tracking-normal">{index}</span>
      <span aria-hidden="true" className={cn("h-px w-8", tone === "dark" ? "bg-gold/70" : "bg-gold")} />
      <span>{label}</span>
    </Reveal>
  );
}
