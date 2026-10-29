"use client";

import { stagger, useAnimate, useInView } from "motion/react";
import { useEffect, useLayoutEffect } from "react";
import { sectionShort, type SectionCode } from "@/lib/site";

const pct = (v: number, min: number, max: number) => ((v - min) / (max - min)) * 100;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One horizontal instrument: the total on its 472–528 scale and each section on 118–132.
 * The bars always render at their true values. With motion allowed, they are
 * drawn once, on a timer (under 900 ms), the first time the instrument comes
 * into view, so stopping mid-scroll can never leave a bar showing a wrong value.
 */
export function ScoreInstrument({ total, sections, taken }: { total: number; sections: Partial<Record<SectionCode, number>>; taken: string }) {
  const [scope, animate] = useAnimate<HTMLElement>();
  const inView = useInView(scope, { once: true, amount: 0.2 });

  // Client only, before first paint: hide the bars so the draw can start from zero.
  useLayoutEffect(() => {
    if (reducedMotion() || inView) return;
    scope.current?.querySelectorAll<HTMLElement>("[data-bar]").forEach((el) => {
      el.style.transform = "scaleX(0)";
    });
    // Only on mount: once drawn, bars stay drawn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!inView || reducedMotion()) return;
    animate("[data-bar]", { scaleX: [0, 1] }, { duration: 0.6, delay: stagger(0.1), ease: [0.2, 0.7, 0.2, 1] });
  }, [inView, animate]);

  const ticks = Array.from({ length: 57 }, (_, i) => 472 + i);
  return (
    <figure ref={scope} aria-label={`MCAT total score ${total} out of 528, ${taken}`}>
      <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
        <p className="font-display text-[clamp(6rem,16vw,13rem)] leading-[0.85] text-hema tabular-nums">
          <span className="relative inline-block">
            <span aria-hidden className="absolute inset-x-[-0.04em] bottom-[0.08em] h-[0.22em] bg-mark" />
            <span className="relative">{total}</span>
          </span>
        </p>
        <figcaption className="max-w-xs pb-4 text-[1.0625rem] text-specimen/85">
          My MCAT score, {taken}. Totals run from 472 to 528; each section from 118 to 132.
        </figcaption>
      </div>

      <div className="mt-14" aria-hidden>
        <div className="relative h-14">
          <div className="absolute inset-x-0 bottom-0 flex justify-between">
            {ticks.map((t) => (
              <span key={t} className={`w-px bg-hema/40 ${t % 10 === 0 ? "h-5" : "h-2.5"}`} />
            ))}
          </div>
          <div data-bar className="absolute bottom-0 left-0 h-[3px] origin-left bg-hema" style={{ width: `${pct(total, 472, 528)}%` }} />
          <div className="absolute -bottom-1 h-6 w-[10px] -translate-x-1/2 rounded-sm bg-mark ring-1 ring-hema/40" style={{ left: `${pct(total, 472, 528)}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-sm tabular-nums text-quiet">
          <span>472</span>
          <span>528</span>
        </div>
      </div>

      <ul className="mt-14 grid gap-8 sm:grid-cols-3" aria-label="Section scores">
        {(["CP", "BB", "PS"] as const).map((code) => {
          const v = sections[code]!;
          return (
            <li key={code}>
              <p className="flex items-baseline justify-between">
                <span className="text-[1.0625rem] text-specimen/85">{sectionShort[code]}</span>
                <span className="font-display text-3xl tabular-nums text-hema">{v}</span>
              </p>
              <div className="relative mt-3 h-[3px] bg-hema/15" aria-hidden>
                <div data-bar className="absolute inset-y-0 left-0 origin-left bg-hema" style={{ width: `${pct(v, 118, 132)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
