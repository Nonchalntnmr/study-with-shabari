"use client";

import { useEffect, useRef } from "react";
import { beatWeights, damp } from "@/lib/experience/timeline";
import type { StoryStore } from "../story-store";

// The Instrument: kinetic type, no WebGL. Scroll progress becomes CSS custom properties on the
// stage (--w0 … --w4, one weight per beat), and every moving part is a transform or an opacity
// computed from them in CSS, so nothing re-renders while scrolling.

export type InstrumentWords = { score: number; qualifier: string; taken: string; scale: { min: number; max: number }; phrases: string[]; points: string[] };

function Odometer({ value, rolling }: { value: number; rolling: boolean }) {
  const digits = String(value).split("").map(Number);
  return (
    <span className="inline-flex overflow-hidden leading-[1]" aria-hidden>
      {digits.map((d, i) => (
        // Two cycles of 0–9: first paint already shows the right digit (first cycle); the roll ends
        // on the same digit in the second cycle, so a wrong number is never on screen.
        <span key={i} className="relative inline-block h-[1.12em] overflow-hidden">
          <span
            className="block"
            style={{
              transform: `translateY(${-(rolling ? d + 10 : d) * 1.12}em)`,
              transition: rolling ? `transform ${1.1 + i * 0.22}s cubic-bezier(0.16, 0.84, 0.24, 1)` : "none",
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

export function InstrumentStage({ store, words, rolling }: { store: StoryStore; words: InstrumentWords; rolling: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const s = { frame: 0, last: performance.now(), p: store.progress, visible: true };
    const io = new IntersectionObserver(([e]) => {
      s.visible = e.isIntersecting;
      if (s.visible && !s.frame) s.frame = requestAnimationFrame(tick);
    });
    io.observe(el);
    const tick = (now: number) => {
      s.frame = 0;
      const dt = Math.min(0.1, (now - s.last) / 1000);
      s.last = now;
      s.p = damp(s.p, store.progress, 7, dt);
      const w = beatWeights(s.p, store.marks);
      for (let i = 0; i < 5; i++) el.style.setProperty(`--w${i}`, (w[i] ?? 0).toFixed(4));
      if (s.visible) s.frame = requestAnimationFrame(tick);
    };
    s.frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(s.frame);
      io.disconnect();
    };
  }, [store]);

  const pct = ((words.score - words.scale.min) / (words.scale.max - words.scale.min)) * 100;
  const ticks = Array.from({ length: words.scale.max - words.scale.min + 1 }, (_, i) => words.scale.min + i);

  return (
    <div
      ref={root}
      className="relative h-full w-full overflow-hidden"
      style={{ ["--w0" as string]: 1, ["--w1" as string]: 0, ["--w2" as string]: 0, ["--w3" as string]: 0, ["--w4" as string]: 0 }}
    >
      <div className="absolute inset-0 flex items-center justify-center md:pl-[36%] md:pr-[5%]">
        <div className="relative w-full max-w-[44rem] px-6">
          {/* the number */}
          <div
            className="exp-kinetic origin-center text-center font-display text-[clamp(8rem,24vw,21rem)] tracking-[-0.045em] text-hema"
            style={{
              opacity: "clamp(0, calc((var(--w0) + var(--w1) + var(--w4) - 0.35) / 0.3), 1)",
              transform: "translateY(calc((var(--w1) + var(--w4)) * -22%)) scale(calc(1 - (var(--w1) + var(--w4)) * 0.42 - var(--w2) * 0.2))",
            }}
          >
            <Odometer value={words.score} rolling={rolling} />
          </div>
          <p
            className="exp-kinetic exp-label-caps -mt-2 text-center text-[color:var(--exp-quiet)]"
            style={{ opacity: "clamp(0, calc((var(--w0) + var(--w4) - 0.35) / 0.3), 1)", transform: "translateY(calc(var(--w4) * -120%))" }}
          >
            MCAT · {words.taken} · {words.qualifier}
          </p>

          {/* the scale */}
          <div className="exp-kinetic absolute inset-x-6 top-[62%]" style={{ opacity: "clamp(0, calc((var(--w1) - 0.35) / 0.3), 1)", transform: "translateY(calc((1 - var(--w1)) * 30px))" }}>
            <div className="relative h-12">
              <div className="absolute inset-x-0 bottom-0 flex justify-between">
                {ticks.map((t) => (
                  <span key={t} className={`w-px bg-hema/45 ${t % 10 === 0 ? "h-6" : "h-2.5"}`} />
                ))}
              </div>
              <div className="exp-kinetic absolute bottom-0 left-0 h-[3px] origin-left bg-hema" style={{ width: `${pct}%`, transform: "scaleX(var(--w1))" }} />
              <div className="absolute -bottom-1.5 h-7 w-[10px] -translate-x-1/2 rounded-sm bg-eosin" style={{ left: `${pct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[0.9rem] tabular-nums text-[color:var(--exp-quiet)]">
              <span>{words.scale.min}</span>
              <span>{words.scale.max}</span>
            </div>
          </div>

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
          <ol className="exp-kinetic absolute inset-x-6 top-1/2 -translate-y-1/2 border-t border-hema/20" style={{ opacity: "clamp(0, calc((var(--w3) - 0.35) / 0.3), 1)" }}>
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
