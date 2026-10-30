"use client";

import { useEffect, useState } from "react";
import { ScrollStory, type StepContent } from "../scroll-story";
import { createStore } from "../story-store";
import { InstrumentStage, type InstrumentWords } from "./instrument-stage";

/** The Instrument sequence: kinetic type on a sticky stage, the words from the server page. */
export function InstrumentStory({ steps, words, label = "522, then how she teaches" }: { steps: StepContent[]; words: InstrumentWords; label?: string }) {
  const [store] = useState(() => createStore(steps.length));
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setRolling(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const replay = () => {
    setRolling(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setRolling(true)));
  };
  const withReplay = steps.map((s, i) =>
    i === 0
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
  );
}
