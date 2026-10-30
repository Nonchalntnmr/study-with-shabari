"use client";

import { useEffect, useRef } from "react";
import { beatWeights, damp } from "@/lib/experience/timeline";
import { useActiveBeat } from "../scroll-story";
import type { StoryStore } from "../story-store";

// The 522 reveal: kinetic type, no WebGL. Scroll progress becomes CSS custom properties on the
// stage (--w0 … --w4, one weight per beat), and every moving part is a transform or an opacity
// computed from them in CSS, so nothing re-renders while scrolling. Beats: 0 the score on its
// scale, 1 the three section scores, 2 her approach, 3 the tutoring points, 4 (optional) booking.
// The whole stage is decorative (aria-hidden by the story); the panels carry the same text plainly.

export type InstrumentWords = {
  score: number;
  taken: string;
  scale: { min: number; max: number };
  sections: { label: string; value: number }[];
  sectionScale: { min: number; max: number };
  phrases: string[];
  points: string[];
};

/** Digits that roll into place. Two cycles of 0–9: first paint already shows the right digit, and
 * the roll ends on the same digit one cycle on, so a wrong number is never on screen. */
export function Odometer({ value, rolling, delay = 0 }: { value: number; rolling: boolean; delay?: number }) {
  const digits = String(value).split("").map(Number);
  return (
    <span className="inline-flex overflow-hidden leading-[1]" aria-hidden>
      {digits.map((d, i) => (
        <span key={i} className="relative inline-block h-[1.12em] overflow-hidden">
          <span
            className="block motion-reduce:!transform-none"
            style={{
              transform: `translateY(${-(rolling ? d + 10 : d) * 1.12}em)`,
              transition: rolling ? `transform ${1.1 + i * 0.22}s cubic-bezier(0.16, 0.84, 0.24, 1) ${delay}s` : "none",
            }}
          >
            {Array.from({ length: 20 }, (_, k) => (
              <span key={k} className="block h-[1.12em] leading-[1.12em]">
                {k % 10}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Opacity for a beat's layer: on only while its weight is past the midpoint, so layers never pile up. */
const on = (w: string) => `clamp(0, calc((${w} - 0.35) / 0.3), 1)`;

export function InstrumentStage({ store, words, rolling }: { store: StoryStore; words: InstrumentWords; rolling: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const active = useActiveBeat();

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const s = { frame: 0, last: performance.now(), p: store.progress, visible: true };
    const tick = (now: number) => {
      s.frame = 0;
      const dt = Math.min(0.1, (now - s.last) / 1000);
      s.last = now;
      s.p = damp(s.p, store.progress, 7, dt);
      const w = beatWeights(s.p, store.marks);
      for (let i = 0; i < 5; i++) el.style.setProperty(`--w${i}`, (w[i] ?? 0).toFixed(4));
      if (s.visible) s.frame = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      s.visible = e.isIntersecting;
      if (s.visible && !s.frame) {
        s.last = performance.now();
        s.frame = requestAnimationFrame(tick);
      }
    });
    io.observe(el);
    return () => {
      cancelAnimationFrame(s.frame);
      io.disconnect();
    };
  }, [store]);

  const pct = (v: number, min: number, max: number) => ((v - min) / (max - min)) * 100;
  const ticks = Array.from({ length: words.scale.max - words.scale.min + 1 }, (_, i) => words.scale.min + i);

  return (
    <div
      ref={root}
      className="relative h-full w-full overflow-hidden"
      style={{ ["--w0" as string]: 1, ["--w1" as string]: 0, ["--w2" as string]: 0, ["--w3" as string]: 0, ["--w4" as string]: 0 }}
    >
      <div className="absolute inset-0 flex items-center justify-center md:pl-[36%] md:pr-[5%]">
        <div className="relative h-[min(36rem,80%)] w-full max-w-[44rem] px-6">
          {/* the number, then smaller above the sections */}
          <div
            className="exp-kinetic absolute inset-x-6 top-[12%] origin-top text-center font-display text-[clamp(7.5rem,22vw,20rem)] leading-none tracking-[-0.045em] text-hema"
            style={{
              opacity: `clamp(0, calc((var(--w0) + var(--w1) + var(--w4) - 0.35) / 0.3), 1)`,
              transform: "translateY(calc((var(--w1) + var(--w4)) * -8%)) scale(calc(1 - (var(--w1) + var(--w4)) * 0.5))",
            }}
          >
            <Odometer value={words.score} rolling={rolling} />
          </div>
          <p className="exp-kinetic exp-label-caps absolute inset-x-6 top-[62%] text-center text-[color:var(--exp-quiet)]" style={{ opacity: on("var(--w0)") }}>
            MCAT · {words.taken}
          </p>

          {/* the 472–528 scale */}
          <div className="exp-kinetic absolute inset-x-6 top-[70%]" style={{ opacity: on("var(--w0)") }}>
            <div className="relative h-9">
              <div className="absolute inset-x-0 bottom-0 flex justify-between">
                {ticks.map((t) => (
                  <span key={t} className={`w-px bg-hema/45 ${t % 10 === 0 ? "h-5" : "h-2"}`} />
                ))}
              </div>
              <div className="absolute bottom-0 left-0 h-[3px] bg-hema" style={{ width: `${pct(words.score, words.scale.min, words.scale.max)}%` }} />
              <div className="absolute -bottom-1.5 h-6 w-[10px] -translate-x-1/2 rounded-sm bg-eosin" style={{ left: `${pct(words.score, words.scale.min, words.scale.max)}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[0.85rem] tabular-nums text-[color:var(--exp-quiet)]">
              <span>{words.scale.min}</span>
              <span>{words.scale.max}</span>
            </div>
          </div>

          {/* the three sections, each on its 118–132 bar */}
          <ul className="exp-kinetic absolute inset-x-6 top-[50%] grid grid-cols-3 gap-5 sm:gap-8" style={{ opacity: on("var(--w1)"), transform: "translateY(calc((1 - var(--w1)) * 40px))" }}>
            {words.sections.map((s, i) => (
              <li key={s.label} className="text-center">
                <span className="block font-display text-[clamp(3rem,7vw,5.6rem)] leading-none tracking-[-0.03em] text-hema">
                  <Odometer value={s.value} rolling={rolling && active >= 1} delay={0.1 * i} />
                </span>
                <span className="mt-2 block text-[0.95rem] font-semibold text-[color:var(--exp-quiet)]">{s.label}</span>
                <span className="relative mt-3 block h-[3px] bg-hema/15">
                  <span
                    className="exp-kinetic absolute inset-y-0 left-0 origin-left bg-hema"
                    style={{ width: `${pct(s.value, words.sectionScale.min, words.sectionScale.max)}%`, transform: "scaleX(clamp(0, calc((var(--w1) - 0.3) / 0.5), 1))" }}
                  />
                </span>
              </li>
            ))}
          </ul>

          {/* her words */}
          <ul className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center font-display text-[clamp(2.6rem,6vw,5.4rem)] leading-[1.02] text-hema">
            {words.phrases.map((ph, i) => (
              <li
                key={ph}
                className="exp-kinetic"
                style={{
                  opacity: `clamp(0, calc((var(--w2) - 0.35) / 0.3 * 3 - ${i}), 1)`,
                  transform: `translateY(calc((1 - clamp(0, calc(var(--w2) * 3 - ${i}), 1)) * 48px))`,
                }}
              >
                {ph}
              </li>
            ))}
          </ul>

          {/* how sessions work */}
          <ol className="exp-kinetic absolute inset-x-6 top-1/2 -translate-y-1/2 border-t border-hema/20" style={{ opacity: on("var(--w3)") }}>
            {words.points.map((pt, i) => (
              <li
                key={pt}
                className="exp-kinetic flex items-baseline gap-5 border-b border-hema/20 py-5 font-display text-[clamp(1.4rem,2.6vw,2.2rem)] leading-tight text-hema"
                style={{
                  opacity: `clamp(0, calc(var(--w3) * 3 - ${i}), 1)`,
                  transform: `translateX(calc((1 - clamp(0, calc(var(--w3) * 3 - ${i}), 1)) * 40px))`,
                }}
              >
                <span className="font-sans text-[0.9rem] font-semibold tabular-nums text-[color:var(--exp-quiet)]">0{i + 1}</span>
                {pt}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
