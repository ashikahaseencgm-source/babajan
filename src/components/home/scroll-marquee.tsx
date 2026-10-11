"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

/**
 * A navy band of brand values that slides only while the visitor scrolls
 * (scroll-linked, never auto-playing), so there is nothing to pause.
 */
export function ScrollMarquee({ words }: { words: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const line = Array.from({ length: 4 }, () => words).flat();
  return (
    <div ref={ref} className="on-dark overflow-hidden border-y border-gold/40 bg-navy py-5" aria-label={words.join(". ")} role="img">
      <motion.div className="flex w-max items-center gap-8 whitespace-nowrap" style={reduce ? undefined : { x }} aria-hidden="true">
        {line.map((w, i) => (
          <span key={i} className="flex items-center gap-8 font-display text-3xl italic text-ivory lg:text-5xl">
            {w}
            <span className="size-2 rotate-45 border border-gold" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}
