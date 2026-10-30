"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollStory, type StepContent } from "../scroll-story";
import { createStore } from "../story-store";
import { InstrumentStage, type InstrumentWords } from "./instrument-stage";

/** The Instrument sequence: kinetic type on a sticky stage, the words from the server page. */
export function InstrumentStory({ steps, words, label = "522, then how she teaches", replayable = true }: { steps: StepContent[]; words: InstrumentWords; label?: string; replayable?: boolean }) {
  const [store] = useState(() => createStore(steps.length));
  const [rolling, setRolling] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // Roll the number the first time the reveal comes into view (at once when it opens the page).
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      requestAnimationFrame(() => setRolling(true));
      io.disconnect();
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const replay = () => {
    setRolling(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setRolling(true)));
  };
  const withReplay = steps.map((s, i) =>
    i === 0 && replayable
      ? {
          ...s,
          panel: (
            <>
              {s.panel}
              <button
                type="button"
                onClick={replay}
                className="mt-4 h-10 rounded-full border border-[color:var(--exp-rule)] bg-white px-4 text-[0.9rem] font-semibold text-hema hover:border-hema/50 motion-reduce:hidden"
              >
                Replay the reveal
              </button>
            </>
          ),
        }
      : s,
  );
  return (
    <div ref={box}>
    <ScrollStory
      store={store}
      label={label}
      steps={withReplay}
      stage={
        <div className="exp-spotlight h-full w-full">
          <InstrumentStage store={store} words={words} rolling={rolling} />
        </div>
      }
    />
    </div>
  );
}
