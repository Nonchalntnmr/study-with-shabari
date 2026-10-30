"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { activeBeat, clamp01 } from "@/lib/experience/timeline";
import { type StoryStore, setLayout, setProgress } from "./story-store";

// A scroll story: one sticky stage, with one tall step per beat scrolling over it. Native
// scrolling throughout; scroll progress goes to a mutable store, never to React state, except
// the index of the active beat (which changes a handful of times per story).
//
// Reduced motion is handled in CSS (experience.css): the stage disappears and each step shows its
// own still figure, so the layout is right from the first paint and nothing scrubs.

const ActiveBeat = createContext(0);
export const useActiveBeat = () => useContext(ActiveBeat);

export type StepContent = { id: string; nav: string; panel: React.ReactNode; figure?: React.ReactNode };

export function ScrollStory({
  store,
  label,
  steps,
  stage,
  panelSide = "left",
  className = "",
}: {
  store: StoryStore;
  label: string;
  steps: StepContent[];
  stage: React.ReactNode;
  panelSide?: "left" | "right";
  className?: string;
}) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const at = { top: 0, span: 1, frame: 0 };
    const update = () => {
      at.frame = 0;
      const p = clamp01((window.scrollY - at.top) / at.span);
      setProgress(store, p);
      setActive(activeBeat(p, store.marks));
    };
    const measure = () => {
      const r = el.getBoundingClientRect();
      at.top = r.top + window.scrollY;
      const vh = window.innerHeight;
      at.span = Math.max(1, el.offsetHeight - vh);
      const wide = window.innerWidth >= 768;
      // Where a step is "read": mid-screen on desktop; on a phone, the middle of the half below the stage.
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const focus = wide || reduce ? vh / 2 : vh * 0.75;
      const marks: number[] = [];
      el.querySelectorAll<HTMLElement>("[data-step]").forEach((step) => {
        const sr = step.getBoundingClientRect();
        marks.push(clamp01((sr.top + window.scrollY + sr.height / 2 - at.top - focus) / at.span));
      });
      setLayout(store, marks, wide);
      update();
    };
    const onScroll = () => {
      if (!at.frame) at.frame = requestAnimationFrame(update);
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(at.frame);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, [store]);

  const go = (i: number) => {
    const step = root.current?.querySelectorAll<HTMLElement>("[data-step]")[i];
    if (!step) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const focus = window.innerWidth >= 768 || reduce ? window.innerHeight / 2 : window.innerHeight * 0.75;
    const y = step.getBoundingClientRect().top + window.scrollY + step.offsetHeight / 2 - focus;
    window.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });
    // Move focus with the view, so keyboard users continue reading from the beat they chose.
    step.querySelector<HTMLElement>("[data-step-heading]")?.focus({ preventScroll: true });
  };

  return (
    <ActiveBeat value={active}>
      <section ref={root} aria-label={label} className={`relative ${className}`} data-story>
        <div className="exp-story-stage overflow-hidden" aria-hidden>
          {stage}
        </div>
        <div className="exp-beat-nav pointer-events-none absolute inset-y-0 right-3 z-20 max-md:hidden sm:right-6">
          <nav aria-label={`${label}: beats`} className="pointer-events-auto sticky top-[calc(var(--exp-header)+50svh-8rem)]">
            <ol className="grid w-9 gap-1.5 rounded-full bg-[color:var(--exp-bar)] py-2 shadow-sm ring-1 ring-[color:var(--exp-rule)]">
              {steps.map((s, i) => (
                <li key={s.id} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Go to ${s.nav}`}
                    aria-current={active === i ? "step" : undefined}
                    className="grid size-7 place-items-center rounded-full"
                  >
                    <span aria-hidden className={`block rounded-full transition-all ${active === i ? "size-2.5 bg-hema" : "size-1.5 bg-hema/35"}`} />
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>
        <ol className="exp-story-steps pointer-events-none">
          {steps.map((s, i) => (
            <li
              key={s.id}
              data-step={i}
              data-beat={s.id}
              className={`exp-step flex flex-col px-4 py-10 sm:px-8 md:justify-center ${panelSide === "right" ? "md:items-end" : "md:items-start"}`}
            >
              <div className="mx-auto w-full max-w-[1440px]">
                <div className={`pointer-events-auto w-full md:max-w-[27rem] ${panelSide === "right" ? "md:ml-auto" : ""}`}>{s.panel}</div>
                {s.figure && <div className="exp-inline-figure mt-8 w-full max-w-2xl">{s.figure}</div>}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </ActiveBeat>
  );
}

/** The caption card for one beat. */
export function Panel({ kicker, title, children, level = 2 }: { kicker?: string; title: string; children?: React.ReactNode; level?: 1 | 2 }) {
  const H = level === 1 ? "h1" : "h2";
  return (
    <div className="exp-panel rounded-2xl p-6 sm:p-7">
      {kicker && <p className="exp-label-caps text-[color:var(--exp-quiet)]">{kicker}</p>}
      <H data-step-heading tabIndex={-1} className={`${kicker ? "mt-3" : ""} ${level === 1 ? "text-[clamp(2.4rem,5vw,4.2rem)] leading-[1]" : "text-[clamp(1.6rem,2.6vw,2.15rem)] leading-[1.08]"} outline-none`}>
        {title}
      </H>
      {children && <div className="mt-4 space-y-3 text-[1.0625rem] leading-relaxed text-specimen/90">{children}</div>}
    </div>
  );
}
