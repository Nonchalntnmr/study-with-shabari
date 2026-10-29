"use client";

import { motion, useReducedMotion } from "motion/react";
import { sectionShort, type SectionCode } from "@/lib/site";

const pct = (v: number, min: number, max: number) => ((v - min) / (max - min)) * 100;

/** One horizontal instrument: the total on its 472–528 scale and each section on 118–132. Drawn once on scroll. */
export function ScoreInstrument({ total, sections, taken }: { total: number; sections: Partial<Record<SectionCode, number>>; taken: string }) {
  const reduce = useReducedMotion();
  const draw = (delay = 0) =>
    reduce
      ? {}
      : { initial: { scaleX: 0 }, whileInView: { scaleX: 1 }, viewport: { once: true, amount: 0.6 }, transition: { duration: 1.4, delay, ease: [0.2, 0.7, 0.2, 1] as const } };
  const ticks = Array.from({ length: 57 }, (_, i) => 472 + i);
  return (
    <figure aria-label={`MCAT total score ${total} out of 528, ${taken}`}>
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
          <motion.div {...draw(0.1)} className="absolute bottom-0 left-0 h-[3px] origin-left bg-hema" style={{ width: `${pct(total, 472, 528)}%` }} />
          <div className="absolute -bottom-1 h-6 w-[10px] -translate-x-1/2 rounded-sm bg-mark ring-1 ring-hema/40" style={{ left: `${pct(total, 472, 528)}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-sm tabular-nums text-quiet">
          <span>472</span>
          <span>528</span>
        </div>
      </div>

      <ul className="mt-14 grid gap-8 sm:grid-cols-3" aria-label="Section scores">
        {(["CP", "BB", "PS"] as const).map((code, i) => {
          const v = sections[code]!;
          return (
            <li key={code}>
              <p className="flex items-baseline justify-between">
                <span className="text-[1.0625rem] text-specimen/85">{sectionShort[code]}</span>
                <span className="font-display text-3xl tabular-nums text-hema">{v}</span>
              </p>
              <div className="relative mt-3 h-[3px] bg-hema/15" aria-hidden>
                <motion.div {...draw(0.35 + i * 0.15)} className="absolute inset-y-0 left-0 origin-left bg-hema" style={{ width: `${pct(v, 118, 132)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
