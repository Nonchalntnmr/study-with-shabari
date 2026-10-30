"use client";

import { useMotionValueEvent, useScroll } from "motion/react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useStageMode } from "./capabilities";
import { narrative } from "./scene/narrative-store";

/** 1–3 while the synthesis chapter builds; 3 everywhere else (and when static). */
const StepContext = createContext<1 | 2 | 3>(3);
export const useSynthesisStep = () => useContext(StepContext);

/**
 * Hero + story. Native scrolling throughout: the stage is CSS-sticky, and scroll
 * progress (from motion) is written to the scene's store, never to React state,
 * except the three-step synthesis reveal.
 */
export function StoryScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [step, setStep] = useState<1 | 2 | 3>(3);
  const { mode, wide } = useStageMode();
  const scrubbed = mode === "live" && wide;

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __narrative: typeof narrative }).__narrative = narrative;
    const measure = () => {
      const root = ref.current;
      if (!root) return;
      const span = root.offsetHeight - window.innerHeight;
      if (span <= 0) return;
      for (const key of ["a", "b", "c"] as const) {
        const el = root.querySelector<HTMLElement>(`[data-chapter="${key}"]`);
        if (el) narrative.marks[key] = Math.min(1, Math.max(0, (el.offsetTop + el.offsetHeight / 2 - window.innerHeight / 2) / span));
      }
      const right = (sel: string) => {
        const el = root.querySelector<HTMLElement>(sel);
        return el ? el.getBoundingClientRect().right / window.innerWidth : undefined;
      };
      narrative.textRight.hero = right(".hero-copy") ?? narrative.textRight.hero;
      narrative.textRight.a = right('[data-chapter="a"] .panel') ?? narrative.textRight.a;
      narrative.textRight.b = right('[data-chapter="b"] .panel') ?? narrative.textRight.b;
      locateVta();
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    narrative.progress = v;
    const { a, b } = narrative.marks;
    // Build the synthesis in three beats across the approach to chapter B.
    const into = (v - (a + (b - a) * 0.35)) / ((b - a) * 0.65);
    setStep(!scrubbed ? 3 : into < 0.34 ? 1 : into < 0.67 ? 2 : 3);
    locateVta();
  });

  return (
    <StepContext value={step}>
      <div ref={ref} className="story relative" data-mode={mode}>
        {children}
      </div>
    </StepContext>
  );
}

/** Tell the scene where the pathway figure's VTA dot is, so the molecule can recede into it. */
function locateVta() {
  const dot = document.querySelector<SVGElement>("[data-vta-dot]");
  const stage = document.querySelector<HTMLElement>("[data-stage]");
  if (!dot || !stage) return;
  const d = dot.getBoundingClientRect();
  const s = stage.getBoundingClientRect();
  if (!s.width || !d.width) return;
  narrative.vta.x = ((d.left + d.width / 2 - s.left) / s.width) * 2 - 1;
  narrative.vta.y = -(((d.top + d.height / 2 - s.top) / s.height) * 2 - 1);
}
