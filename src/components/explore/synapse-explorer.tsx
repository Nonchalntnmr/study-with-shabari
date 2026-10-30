"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { GlStage, TurnControls } from "@/components/experience/gl-stage";
import { createStore, setFlag, setPhases, setProgress } from "@/components/experience/story-store";
import { evenMarks } from "@/lib/experience/timeline";
import { LESSON, NEW } from "@/lib/explore/signaling-copy";
import { SynapseStill } from "./synapse-still";

// The axon terminal and synapse, one step at a time: Ca²⁺ entry, release, diffusion, binding,
// termination. The stage is the Synapse prototype's WebGL scene, lazy-loaded once the page is idle
// and the stage is near the viewport; each step sets the scene's phase and it glides there. The
// still for the step paints first and stays when WebGL is off, motion is reduced or the device is
// low-powered.

const SynapseScene = dynamic(() => import("@/components/experience/synapse/synapse-scene"), { ssr: false });

type Step = { id: string; nav: string; title: string; phase: number; body: React.ReactNode; still: string };

const STEPS: Step[] = [
  { id: "calcium", nav: "Ca²⁺ enters", title: "Voltage-gated Ca²⁺ channels open", phase: 1.7, still: "The axon terminal: an action potential arrives and Ca²⁺ flows in through voltage-gated channels", body: <p>{NEW.synCalcium}</p> },
  { id: "release", nav: "Release", title: "Vesicles fuse and release", phase: 2.35, still: "A vesicle fuses with the membrane and releases dopamine into the synaptic cleft", body: <p>{NEW.synRelease}</p> },
  { id: "diffusion", nav: "Diffusion", title: "Across the cleft", phase: 3.0, still: "Dopamine spread through the synaptic cleft", body: <p>{NEW.synDiffuse}</p> },
  {
    id: "binding",
    nav: "Binding",
    title: "Binding to receptors",
    phase: 4.0,
    still: "Dopamine bound to D1 and D2 receptors: cAMP rises beside D1 and falls beside D2",
    body: (
      <>
        <p>{NEW.synBind}</p>
        <ul className="grid gap-1.5">
          <li>{LESSON.d1}</li>
          <li>{LESSON.d2}</li>
        </ul>
      </>
    ),
  },
  { id: "termination", nav: "Termination", title: "Ending the signal", phase: 5.2, still: "Dopamine taken back up through the dopamine transporter", body: <p>{LESSON.cleared}</p> },
];

export function SynapseExplorer() {
  const [store] = useState(() => {
    const s = createStore(STEPS.length);
    s.marks = evenMarks(STEPS.length);
    setPhases(s, STEPS.map((x) => x.phase));
    setFlag(s, "centered", true);
    return s;
  });
  const [step, setStep] = useState(0);
  const [blocked, setBlocked] = useState(false);

  function go(i: number) {
    const n = Math.max(0, Math.min(STEPS.length - 1, i));
    setStep(n);
    setProgress(store, store.marks[n]);
  }

  const s = STEPS[step];
  const still = <SynapseStill phase={s.phase} datBlocked={blocked && s.id === "termination"} title={blocked && s.id === "termination" ? `${s.still}, with DAT blocked: dopamine stays in the cleft` : s.still} uid={`st${step}`} />;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14" data-explorer="synapse">
      <div className="min-w-0 space-y-6">
        <ol
          aria-label="Steps at the synapse"
          className="grid grid-cols-1 gap-2 sm:grid-cols-5 lg:grid-cols-1"
          onKeyDown={(e) => {
            const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
            if (!d) return;
            e.preventDefault();
            go(step + d);
            (e.currentTarget.querySelectorAll("button")[Math.max(0, Math.min(STEPS.length - 1, step + d))] as HTMLButtonElement | undefined)?.focus();
          }}
        >
          {STEPS.map((x, i) => (
            <li key={x.id}>
              <button type="button" aria-current={i === step ? "step" : undefined} onClick={() => go(i)} className="sig-step w-full justify-start text-left" data-step={x.id}>
                <span className="mr-2 tabular-nums text-quiet">{i + 1}</span>
                {x.nav}
              </button>
            </li>
          ))}
        </ol>
        <div role="status" aria-live="polite" className="space-y-3 rounded-xl border border-hairline bg-mist px-4 py-4 text-[1.02rem] leading-relaxed text-specimen" data-synapse-status={s.id}>
          <p className="font-semibold text-hema">
            Step {step + 1} of {STEPS.length}: {s.title}
          </p>
          {s.body}
          {s.id === "termination" && blocked && <p>{LESSON.cocaine}</p>}
        </div>
        {s.id === "termination" && (
          <label className="relative flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              role="switch"
              checked={blocked}
              onChange={(e) => {
                setBlocked(e.target.checked);
                setFlag(store, "datBlocked", e.target.checked);
              }}
              className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
            />
            <span aria-hidden className="relative h-7 w-12 shrink-0 rounded-full bg-hema/20 transition-colors peer-checked:bg-hema peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-eosin">
              <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all motion-reduce:transition-none ${blocked ? "left-6" : "left-1"}`} />
            </span>
            <span className="text-[1.02rem] font-semibold text-hema">Block DAT</span>
          </label>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => go(step - 1)} disabled={step === 0} className="sig-button-secondary">
            Previous step
          </button>
          <button type="button" onClick={() => go(step + 1)} disabled={step === STEPS.length - 1} className="sig-button-secondary">
            Next step
          </button>
        </div>
      </div>
      <figure className="min-w-0">
        <div className="relative aspect-[511/475] w-full overflow-hidden rounded-2xl border border-hairline bg-[#FBF9F4]">
          <GlStage store={store} Scene={SynapseScene} lazy fallback={<div className="absolute inset-0 p-2 sm:p-4">{still}</div>} />
        </div>
        <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[0.9rem] text-quiet">
          <span>{NEW.scaleNote}</span>
          <TurnControls store={store} label="the synapse" />
        </figcaption>
      </figure>
    </div>
  );
}
