"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { GlStage, TurnControls } from "../gl-stage";
import { ScrollStory, type StepContent } from "../scroll-story";
import { Stills } from "../stills";
import { createStore } from "../story-store";

const SpecimenScene = dynamic(() => import("./specimen-scene"), { ssr: false });

/** The Specimen sequence: the steps and stills come from the server page; the scene is lazy. */
export function SpecimenStory({ steps, stills, label = "Dopamine, taken apart", lead }: { steps: StepContent[]; stills: React.ReactNode[]; label?: string; lead?: React.ReactNode }) {
  const [store] = useState(() => createStore(steps.length));
  const controls = (
    <div className="mt-4">
      <TurnControls store={store} label="the molecule" />
    </div>
  );
  const withControls = steps.map((s, i) =>
    i === 0 && s.panel
      ? {
          ...s,
          panel: (
            <>
              {s.panel}
              {controls}
            </>
          ),
        }
      : s,
  );
  return (
    <ScrollStory
      store={store}
      label={label}
      steps={withControls}
      lead={
        lead && (
          <>
            {lead}
            {/* The turn controls belong to the first beat: under the lead when the lead is that beat. */}
            {!steps[0]?.panel && <div className="mx-auto -mt-6 w-full max-w-[1320px] px-5 pb-6 sm:px-8">{controls}</div>}
          </>
        )
      }
      stage={
        <div className="exp-spotlight h-full w-full">
          <GlStage store={store} Scene={SpecimenScene} fallback={<Stills stills={stills} />} />
        </div>
      }
    />
  );
}
