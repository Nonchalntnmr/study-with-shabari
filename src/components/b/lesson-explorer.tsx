"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type Reading = { id: string; tab: string; section: string; title: string; body: React.ReactNode; figure: React.ReactNode };

/** One molecule, three MCAT sections: an ARIA tab set; arrow keys move between tabs. Inactive panels stay in the HTML, hidden. */
export function LessonExplorer({ readings }: { readings: Reading[] }) {
  const [active, setActive] = useState(0);
  const base = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (i: number) => {
    const next = (i + readings.length) % readings.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Read dopamine three ways" className="flex flex-wrap gap-2">
        {readings.map((r, i) => (
          <button
            key={r.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${base}-tab-${r.id}`}
            aria-selected={active === i}
            aria-controls={`${base}-panel-${r.id}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") move(i + 1);
              if (e.key === "ArrowLeft") move(i - 1);
            }}
            className={cn(
              "h-11 rounded-full px-5 text-[0.98rem] font-semibold transition-colors",
              active === i ? "bg-hema text-white" : "bg-white text-hema ring-1 ring-inset ring-hairline hover:ring-hema/40",
            )}
          >
            {r.tab}
          </button>
        ))}
      </div>
      {readings.map((r, i) => (
        <div
          key={r.id}
          role="tabpanel"
          id={`${base}-panel-${r.id}`}
          aria-labelledby={`${base}-tab-${r.id}`}
          hidden={active !== i}
          className="mt-10 grid items-center gap-12 border-t border-hairline pt-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16"
        >
          <div>
            <p className="text-[0.95rem] font-semibold text-sci-teal">{r.section}</p>
            <h3 className="mt-2 text-[2rem]">{r.title}</h3>
            <div className="mt-6 space-y-5 text-[1.0625rem] leading-relaxed text-specimen/85">{r.body}</div>
          </div>
          <div className="rounded-2xl bg-mist p-6 sm:p-10">{r.figure}</div>
        </div>
      ))}
    </div>
  );
}
