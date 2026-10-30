"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { GlStage, TurnControls } from "../gl-stage";
import { ScrollStory, type StepContent } from "../scroll-story";
import { Stills } from "../stills";
import { createStore } from "../story-store";

const SpecimenScene = dynamic(() => import("./specimen-scene"), { ssr: false });

/** The Specimen sequence: the steps and stills come from the server page; the scene is lazy. */
export function SpecimenStory({ steps, stills, label = "Dopamine, taken apart" }: { steps: StepContent[]; stills: React.ReactNode[]; label?: string }) {
  const [store] = useState(() => createStore(steps.length));
  const withControls = steps.map((s, i) =>
    i === 0
      ? {
          ...s,
          panel: (
            <>
              {s.panel}
              <div className="mt-4">
                <TurnControls store={store} label="the molecule" />
              </div>
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
      stage={
        <div className="exp-spotlight h-full w-full">
          <GlStage store={store} Scene={SpecimenScene} fallback={<Stills stills={stills} />} />
        </div>
      }
    />
  );
}
