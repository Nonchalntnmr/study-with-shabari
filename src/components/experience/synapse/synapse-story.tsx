"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { GlStage, TurnControls } from "../gl-stage";
import { ScrollStory, type StepContent } from "../scroll-story";
import { Stills } from "../stills";
import { createStore, setFlag } from "../story-store";

const SynapseScene = dynamic(() => import("./synapse-scene"), { ssr: false });

/**
 * The Synapse sequence. Its one switch, "Block DAT", is a real control: the scene and the stills
 * both stop reuptake, so dopamine stays in the cleft and on its receptors.
 */
export function SynapseStory({
  steps,
  stills,
  blockedStills,
  blockedFigure,
  datNote,
  label = "Dopamine at a synapse",
}: {
  steps: StepContent[];
  stills: React.ReactNode[];
  blockedStills: React.ReactNode[];
  /** The reuptake beat's still with DAT blocked, for the reduced-motion layout. */
  blockedFigure: React.ReactNode;
  datNote: string;
  label?: string;
}) {
  const [store] = useState(() => createStore(steps.length));
  const [blocked, setBlocked] = useState(false);
  const reuptake = steps.findIndex((s) => s.id === "reuptake");

  const toggle = (
    <div className="mt-5 rounded-xl border border-[color:var(--exp-rule)] bg-white/80 p-4">
      <label className="flex cursor-pointer items-center justify-between gap-4 text-[1rem] font-semibold text-hema">
        Block DAT
        <input
          type="checkbox"
          role="switch"
          checked={blocked}
          onChange={(e) => {
            setBlocked(e.target.checked);
            setFlag(store, "datBlocked", e.target.checked);
          }}
          className="peer sr-only"
        />
        <span aria-hidden className="relative h-7 w-12 shrink-0 rounded-full bg-hema/20 transition-colors peer-checked:bg-hema peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-eosin">
          <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${blocked ? "left-6" : "left-1"}`} />
        </span>
      </label>
      <p role="status" aria-live="polite" className="mt-2 text-[0.95rem] leading-relaxed text-specimen/90">
        {blocked ? datNote : "Turn it on to stop reuptake."}
      </p>
    </div>
  );

  const withControls = steps.map((s, i) => {
    if (i === 0)
      return {
        ...s,
        panel: (
          <>
            {s.panel}
            <div className="mt-4">
              <TurnControls store={store} label="the molecule" />
            </div>
          </>
        ),
      };
    if (i === reuptake)
      return {
        ...s,
        figure: blocked ? blockedFigure : s.figure,
        panel: (
          <>
            {s.panel}
            {toggle}
          </>
        ),
      };
    return s;
  });

  return (
    <ScrollStory
      store={store}
      label={label}
      steps={withControls}
      stage={
        <div className="exp-spotlight h-full w-full">
          <GlStage store={store} Scene={SynapseScene} fallback={<Stills stills={blocked ? blockedStills : stills} />} />
        </div>
      }
    />
  );
}
