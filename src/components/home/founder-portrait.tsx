"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

/** The only motion on the portrait: at most 40px of scroll parallax. */
export function FounderPortrait({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [20, -20]);
  return (
    <div ref={ref} className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[28px]">
      {/* Slightly overscaled so the ±20px drift never shows an edge. */}
      <motion.div style={reduce ? undefined : { y }} className={reduce ? undefined : "scale-[1.07]"}>
        {children}
      </motion.div>
    </div>
  );
}
