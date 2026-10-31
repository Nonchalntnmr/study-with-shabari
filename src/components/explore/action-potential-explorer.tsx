"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStageMode } from "@/components/cinema/capabilities";
import {
  SECOND_OPTIONS,
  STRENGTH,
  type Phase,
  type Run,
  type SecondAfter,
  WINDOW_MS,
  channelsAt,
  fluxAt,
  phaseAt,
  phaseMoments,
  sampleTrace,
  simulate,
  spikes,
  voltageAt,
} from "@/lib/explore/action-potential";
import { NEW, mv } from "@/lib/explore/signaling-copy";
import { cn } from "@/lib/utils";
import { MembraneFigure } from "./membrane-figure";
import { TraceChart } from "./trace-chart";

// The action potential, under the visitor's control: a stimulus of chosen strength (all-or-none),
// an optional second stimulus (refractory periods and summation), a time scrubber and a
// step-through of the phases. Nothing plays until they press Stimulate; with reduced motion the
// trace appears whole and the phases are stills.

/** Seconds of animation for the 14 ms window: slowed down about 270 times. */
const PLAY_S = 3.8;

const STEPS: { phase: Exclude<Phase, "stimulus">; label: string }[] = [
  { phase: "rest", label: "At rest" },
  { phase: "depolarization", label: "Depolarization" },
  { phase: "repolarization", label: "Repolarization" },
  { phase: "hyperpolarization", label: "Hyperpolarization" },
];

const PHASE_TEXT: Record<Phase, string> = {
  rest: NEW.rest,
  stimulus: NEW.strengthHint,
  depolarization: NEW.depolarization,
  repolarization: NEW.repolarization,
  hyperpolarization: NEW.hyperpolarization,
};

const SECOND_LABEL = (s: SecondAfter) => (s === null ? "None" : `${s} ms later`);

/** What happened, in words, for the status line. */
export function outcomeText(run: Run): string {
  const [a, b] = run.stimuli;
  const first =
    a.outcome === "fired" ? `${NEW.fired} ${NEW.allOrNone}` : NEW.belowThreshold.replace("{v}", mv(a.reached ?? a.threshold));
  if (!b) return first;
  const second = {
    fired: NEW.secondRecovered,
    "fired-relative": NEW.secondRelativeFired,
    summed: NEW.secondSummed,
    "absolute-refractory": NEW.secondAbsolute,
    "relative-too-weak": NEW.secondRelativeWeak,
    "below-threshold": NEW.secondBelow,
  }[b.outcome];
  return `${first} ${second}`;
}

export function ActionPotentialExplorer() {
  const { reduced } = useStageMode();
  const [strength, setStrength] = useState<number>(STRENGTH.initial);
  const [second, setSecond] = useState<SecondAfter>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<string>(NEW.idle);
  const frame = useRef(0);

  const samples = useMemo(() => sampleTrace(run), [run]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function stimulate() {
    cancelAnimationFrame(frame.current);
    const next = simulate(strength, second);
    setRun(next);
    if (reduced) {
      setCursor(WINDOW_MS);
      setPlaying(false);
      setStatus(outcomeText(next));
      return;
    }
    setStatus("");
    setPlaying(true);
    const t0 = performance.now();
    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / 1000 / PLAY_S);
      setCursor(u * WINDOW_MS);
      if (u < 1) frame.current = requestAnimationFrame(tick);
      else {
        setPlaying(false);
        setStatus(outcomeText(next));
      }
    };
    setCursor(0);
    frame.current = requestAnimationFrame(tick);
  }

  function jumpTo(t: number) {
    cancelAnimationFrame(frame.current);
    setPlaying(false);
    setCursor(t);
    if (run && !status) setStatus(outcomeText(run));
  }

  const moments = phaseMoments(run);
  const phase = phaseAt(run, cursor);
  const ch = channelsAt(run, cursor);
  const v = voltageAt(run, cursor);
  const fired = spikes(run).length > 0;
  const below = strength < 15;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14" data-explorer="action-potential">
      <div className="min-w-0 space-y-7">
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="ap-strength" className="text-[1.05rem] font-semibold text-hema">
              Stimulus strength
            </label>
            <output htmlFor="ap-strength" className={cn("font-semibold tabular-nums", below ? "text-quiet" : "text-eosin-ink")} data-strength={strength}>
              {strength} mV
            </output>
          </div>
          <input
            id="ap-strength"
            type="range"
            min={STRENGTH.min}
            max={STRENGTH.max}
            step={STRENGTH.step}
            value={strength}
            onChange={(e) => setStrength(Number(e.target.value))}
            aria-valuetext={`${strength} millivolts of depolarization, ${below ? "below" : "at or above"} threshold`}
            aria-describedby="ap-strength-hint"
            className="sig-range mt-3 w-full"
            style={{ "--sig-fill": `${((strength - STRENGTH.min) / (STRENGTH.max - STRENGTH.min)) * 100}%`, "--sig-mark": `${((15 - STRENGTH.min) / (STRENGTH.max - STRENGTH.min)) * 100}%` } as React.CSSProperties}
          />
          <p id="ap-strength-hint" className="mt-2 text-[0.95rem] text-quiet">
            {NEW.strengthHint}
          </p>
        </div>

        <fieldset>
          <legend className="text-[1.05rem] font-semibold text-hema">Second stimulus</legend>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SECOND_OPTIONS.map((s) => (
              <label key={String(s)} className="sig-choice">
                <input type="radio" name="ap-second" value={String(s)} checked={second === s} onChange={() => setSecond(s)} className="peer sr-only" />
                <span>{SECOND_LABEL(s)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={stimulate} className="sig-button-primary">
            {run ? "Stimulate again" : "Stimulate"}
          </button>
          {playing && <span className="text-[0.95rem] text-quiet">Playing, slowed down…</span>}
        </div>

        <p role="status" aria-live="polite" className="min-h-[4.5rem] rounded-xl border border-hairline bg-mist px-4 py-3 text-[1.02rem] leading-relaxed text-specimen" data-ap-status>
          {status}
        </p>

        <div>
          <p className="text-[1.05rem] font-semibold text-hema" id="ap-steps">
            Step through the phases
          </p>
          <div role="group" aria-labelledby="ap-steps" className="mt-3 grid grid-cols-2 gap-2">
            {STEPS.map((s) => (
              <button
                key={s.phase}
                type="button"
                disabled={!moments}
                aria-pressed={!!moments && !playing && phase === s.phase}
                onClick={() => moments && jumpTo(moments[s.phase])}
                className="sig-step"
              >
                {s.label}
              </button>
            ))}
          </div>
          {!fired && <p className="mt-2 text-[0.95rem] text-quiet">{NEW.stepHint}</p>}
        </div>

        <div>
          <label htmlFor="ap-time" className="text-[1.05rem] font-semibold text-hema">
            Time
          </label>
          <input
            id="ap-time"
            type="range"
            min={0}
            max={WINDOW_MS}
            step={0.05}
            value={cursor}
            disabled={!run}
            onChange={(e) => jumpTo(Number(e.target.value))}
            aria-valuetext={`${cursor.toFixed(1)} milliseconds, ${mv(v)}`}
            className="sig-range mt-3 w-full"
            style={{ "--sig-fill": `${(cursor / WINDOW_MS) * 100}%` } as React.CSSProperties}
          />
        </div>
      </div>

      <div className="min-w-0 space-y-5">
        <figure className="rounded-2xl border border-hairline bg-white p-3 sm:p-5">
          <TraceChart run={run} samples={samples} cursor={cursor} title="Membrane potential over time, in millivolts" />
          <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.85rem] text-quiet">
            <span>S1, S2: stimuli</span>
            <span>
              <span aria-hidden className="mr-1.5 inline-block size-2.5 rounded-sm bg-[#FDE2D3] align-middle ring-1 ring-[#F5B08C]" />
              Absolute refractory
            </span>
            <span>
              <span aria-hidden className="mr-1.5 inline-block size-2.5 rounded-sm bg-[#FFF1E3] align-middle ring-1 ring-[#F5CFA5]" />
              Relative refractory
            </span>
          </figcaption>
        </figure>
        <figure className="rounded-2xl border border-hairline bg-white p-3 sm:p-5">
          <MembraneFigure
            na={ch.na}
            k={ch.k}
            flux={fluxAt(run, cursor)}
            vInside={v}
            title={`The axon membrane: Na⁺ channel ${ch.na}, K⁺ channel ${ch.k}`}
          />
          <figcaption aria-live={playing ? "off" : "polite"} className="mt-3 text-[1rem] leading-relaxed text-specimen/90" data-phase={phase}>
            <span className="font-semibold text-hema">{phase === "stimulus" ? "Stimulus" : STEPS.find((s) => s.phase === phase)?.label}.</span> {PHASE_TEXT[phase]}
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
