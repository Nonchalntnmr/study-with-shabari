"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// The application as a journey: six stations on a ruled line, one open at a time. A WAI-ARIA tab
// pattern, so arrow keys, Home and End move between stations. Every word comes from the server page
// (founder-facts admissionsHelp, admissionsTimeline and faq).

export type Station = { id: string; numeral: string; title: string; body: string; detail?: { label: string; text: string }[] };

export function Journey({ stations }: { stations: Station[] }) {
  const base = useId();
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const select = (i: number) => {
    const n = (i + stations.length) % stations.length;
    setActive(n);
    tabs.current[n]?.focus();
  };
  const s = stations[active];
  const pct = (active / (stations.length - 1)) * 100;

  return (
    <div>
      <div className="relative">
        {/* the ruled line, inked up to the open station */}
        <div aria-hidden className="absolute left-[calc(1.5rem-1px)] top-6 bottom-6 w-[2px] bg-hema/15 md:left-6 md:right-6 md:top-[1.45rem] md:bottom-auto md:h-[2px] md:w-auto">
          <div className="h-full w-full origin-top bg-hema transition-transform duration-500 md:origin-left motion-reduce:transition-none max-md:[transform:scaleY(var(--k))] md:[transform:scaleX(var(--k))]" style={{ ["--k" as string]: pct / 100 }} />
        </div>
        <div role="tablist" aria-label="The application, step by step" aria-orientation="horizontal" className="relative grid gap-3 md:grid-cols-6 md:gap-2">
          {stations.map((st, i) => (
            <button
              key={st.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              role="tab"
              id={`${base}-tab-${i}`}
              aria-selected={active === i}
              aria-controls={`${base}-panel`}
              tabIndex={active === i ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => {
                const to = { ArrowRight: active + 1, ArrowDown: active + 1, ArrowLeft: active - 1, ArrowUp: active - 1, Home: 0, End: stations.length - 1 }[e.key];
                if (to === undefined) return;
                e.preventDefault();
                select(to);
              }}
              className="group flex items-center gap-4 rounded-xl py-1 text-left md:flex-col md:items-start md:gap-3"
            >
              <span
                className={cn(
                  "grid size-12 shrink-0 place-items-center rounded-full border-2 font-display text-[1.15rem] transition-colors",
                  i <= active ? "border-hema bg-hema text-white" : "border-hema/25 bg-[#FBF7EE] text-hema group-hover:border-hema/60",
                )}
              >
                {st.numeral}
              </span>
              <span className={cn("font-display text-[1.25rem] leading-tight", active === i ? "text-hema" : "text-hema/70 group-hover:text-hema")}>{st.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`${base}-panel`}
        aria-labelledby={`${base}-tab-${active}`}
        tabIndex={0}
        className="exp-card mt-10 rounded-[1.25rem] p-7 sm:p-10"
      >
        <p className="exp-label-caps text-[color:var(--exp-quiet)]">
          Station {s.numeral} of {stations[stations.length - 1].numeral}
        </p>
        <h3 className="mt-3 text-[clamp(1.9rem,3.4vw,2.8rem)]">{s.title}</h3>
        <p className="mt-4 max-w-2xl text-[1.1875rem] leading-relaxed text-specimen/90">{s.body}</p>
        {s.detail && (
          <dl className="mt-8 grid max-w-2xl gap-0 border-t border-hema/15">
            {s.detail.map((d) => (
              <div key={d.label} className="grid gap-1 border-b border-hema/15 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
                <dt className="font-display text-[1.15rem] text-hema">{d.label}</dt>
                <dd className="text-[1.0625rem] text-specimen/90">{d.text}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-8 flex gap-3">
          <button type="button" onClick={() => setActive(Math.max(0, active - 1))} disabled={active === 0} className="h-11 rounded-full border border-hema/25 px-5 text-[0.95rem] font-semibold text-hema disabled:opacity-35">
            Previous
          </button>
          <button
            type="button"
            onClick={() => setActive(Math.min(stations.length - 1, active + 1))}
            disabled={active === stations.length - 1}
            className="h-11 rounded-full bg-hema px-5 text-[0.95rem] font-semibold text-white disabled:opacity-35"
          >
            Next station
          </button>
        </div>
      </div>
    </div>
  );
}
