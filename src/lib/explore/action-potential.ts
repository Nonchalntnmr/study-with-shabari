// The action potential as numbers, for /explore/signaling. A stylized, deterministic model at
// the MCAT level, not Hodgkin–Huxley: rest −70 mV, threshold −55 mV, peak +35 mV, an undershoot to
// −80 mV. Membrane potential, channel states, phases and refractory windows are pure functions of
// time and the stimuli, shared by the live trace, the membrane figure and the stills.
// Unit-tested in tests/unit/signaling-model.test.ts.

export const REST = -70;
export const THRESHOLD = -55;
export const PEAK = 35;
export const UNDERSHOOT = -80;

/** The trace's time window, in ms. */
export const WINDOW_MS = 14;
/** When the first stimulus starts, in ms. */
export const STIM_AT = 1;
/** A stimulus moves the membrane by its full strength over this long (ms). */
export const STIM_RISE = 0.6;
/** Time constant of a sub-threshold (graded) depolarization fading back to rest (ms). */
const LOCAL_DECAY = 1.0;

/** Stimulus strength, as the depolarization it would cause from rest (mV). */
export const STRENGTH = { min: 2, max: 30, step: 2, initial: 20 } as const;

/** Second-stimulus options: how long after the first stimulus it arrives (ms). */
export const SECOND_OPTIONS = [null, 1.5, 4, 8] as const;
export type SecondAfter = (typeof SECOND_OPTIONS)[number];

// The spike, timed from the moment the membrane crosses threshold (ms).
const RISE = 0.5; // threshold → peak
const FALL = 1.7; // peak → trough, passing rest on the way
const RECOVER = 3.3; // trough → rest
const K_OPEN = 0.45; // voltage-gated K⁺ channels open later than Na⁺ channels, near the peak
const K_CLOSE = RISE + FALL + 1.5; // and close slowly, during the undershoot
const RELATIVE_EXTRA = 12; // extra depolarization needed at the start of the relative refractory period (mV)

const cosEase = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));

/** When the falling phase passes back through rest: the end of the absolute refractory period. */
export const REPOLARIZED = RISE + FALL * (Math.acos(1 - (2 * (PEAK - REST)) / (PEAK - UNDERSHOOT)) / Math.PI);
/** When the undershoot is over: the end of the relative refractory period. */
export const RECOVERED = RISE + FALL + RECOVER;

/** Membrane potential during a spike, `dt` ms after it crossed threshold at `from` mV. */
function spikeV(dt: number, from: number): number {
  if (dt < RISE) return from + (PEAK - from) * cosEase(dt / RISE);
  if (dt < RISE + FALL) return PEAK + (UNDERSHOOT - PEAK) * cosEase((dt - RISE) / FALL);
  if (dt < RECOVERED) {
    const u = (dt - RISE - FALL) / RECOVER;
    return UNDERSHOOT + (REST - UNDERSHOOT) * (1 - (1 - u) * (1 - u));
  }
  return REST;
}

/** The depolarization a stimulus adds `dt` ms after it starts: a ramp, then an exponential fade. */
function bump(strength: number, dt: number): number {
  if (dt < 0) return 0;
  if (dt < STIM_RISE) return (strength * dt) / STIM_RISE;
  return strength * Math.exp(-(dt - STIM_RISE) / LOCAL_DECAY);
}

export type Outcome =
  /** Reached threshold from rest. */
  | "fired"
  /** Reached threshold only because an earlier sub-threshold stimulus hadn't faded yet. */
  | "summed"
  /** Fired during the relative refractory period: it was strong enough. */
  | "fired-relative"
  /** Didn't reach threshold. */
  | "below-threshold"
  /** Arrived while Na⁺ channels were open or inactivated: nothing can fire. */
  | "absolute-refractory"
  /** Arrived in the relative refractory period and was too weak for the raised threshold. */
  | "relative-too-weak";

export type Stimulus = {
  at: number;
  strength: number;
  outcome: Outcome;
  /** Threshold crossing time (ms), when it fired. */
  crossing: number | null;
  /** Membrane potential at the crossing (mV), when it fired. */
  crossV: number | null;
  /** Highest potential the stimulus reached when it didn't fire (mV). */
  reached: number | null;
  /** The threshold it had to reach (mV): −55, or higher in the relative refractory period. */
  threshold: number;
};

export type Run = { stimuli: Stimulus[] };

const fires = (o: Outcome) => o === "fired" || o === "summed" || o === "fired-relative";

/** Potential from the stimuli before index `upto` only. */
function partialV(stimuli: Stimulus[], t: number, upto: number): number {
  let v = REST;
  for (let i = 0; i < upto; i++) {
    const s = stimuli[i];
    if (t < s.at) continue;
    if (fires(s.outcome) && s.crossing !== null && s.crossV !== null) {
      v = t >= s.crossing ? spikeV(t - s.crossing, s.crossV) : v + bump(s.strength, t - s.at);
    } else if (s.outcome === "below-threshold" || s.outcome === "relative-too-weak") {
      v += bump(s.strength, t - s.at);
    }
  }
  return v;
}

/** Where the membrane is in relation to the most recent spike before `t`. */
export function refractoryAt(run: Run | null, t: number): "none" | "absolute" | "relative" {
  if (!run) return "none";
  let last: number | null = null;
  for (const s of run.stimuli) if (s.crossing !== null && s.crossing <= t) last = s.crossing;
  if (last === null) return "none";
  const dt = t - last;
  if (dt < REPOLARIZED) return "absolute";
  if (dt < RECOVERED) return "relative";
  return "none";
}

/** Threshold at time t: −55 mV, raised early in the relative refractory period. */
export function thresholdAt(run: Run | null, t: number): number {
  if (!run || refractoryAt(run, t) !== "relative") return THRESHOLD;
  let last = 0;
  for (const s of run.stimuli) if (s.crossing !== null && s.crossing <= t) last = s.crossing;
  const frac = (t - last - REPOLARIZED) / (RECOVERED - REPOLARIZED);
  return THRESHOLD + RELATIVE_EXTRA * (1 - frac);
}

/**
 * Run the model: one stimulus at STIM_AT of `strength` mV, and optionally a second of the same
 * strength `secondAfter` ms later. Outcomes are decided here, in order, so the second stimulus sees
 * whatever the first left behind (a spike's refractory periods, or a fading sub-threshold bump).
 */
export function simulate(strength: number, secondAfter: SecondAfter = null): Run {
  const times = secondAfter === null ? [STIM_AT] : [STIM_AT, STIM_AT + secondAfter];
  const stimuli: Stimulus[] = [];
  for (const at of times) {
    const window = refractoryAt({ stimuli }, at);
    const threshold = thresholdAt({ stimuli }, at);
    if (window === "absolute") {
      stimuli.push({ at, strength, outcome: "absolute-refractory", crossing: null, crossV: null, reached: null, threshold });
      continue;
    }
    // Step through the stimulus's ramp until the membrane reaches threshold, if it does.
    let crossing: number | null = null;
    let crossV: number | null = null;
    let reached = -Infinity;
    for (let k = 0; k <= 600; k++) {
      const t = at + (STIM_RISE * k) / 600;
      const v = partialV(stimuli, t, stimuli.length) + bump(strength, t - at);
      reached = Math.max(reached, v);
      if (v >= threshold) {
        crossing = t;
        crossV = v;
        break;
      }
    }
    if (crossing !== null) {
      const fromRest = REST + strength >= THRESHOLD;
      const outcome: Outcome = window === "relative" ? "fired-relative" : fromRest ? "fired" : "summed";
      stimuli.push({ at, strength, outcome, crossing, crossV, reached: null, threshold });
    } else {
      stimuli.push({ at, strength, outcome: window === "relative" ? "relative-too-weak" : "below-threshold", crossing: null, crossV: null, reached, threshold });
    }
  }
  return { stimuli };
}

/** Membrane potential (mV) at time t (ms). */
export function voltageAt(run: Run | null, t: number): number {
  return run ? partialV(run.stimuli, t, run.stimuli.length) : REST;
}

/** Threshold crossings (ms) of every action potential in the run. */
export const spikes = (run: Run | null): number[] => (run ? run.stimuli.flatMap((s) => (s.crossing === null ? [] : [s.crossing])) : []);

export type NaState = "closed" | "open" | "inactivated";
export type KState = "closed" | "open";

/** Voltage-gated channel states at time t: Na⁺ opens at threshold and inactivates at the peak; K⁺ opens later and closes slowly. */
export function channelsAt(run: Run | null, t: number): { na: NaState; k: KState } {
  let na: NaState = "closed";
  let k: KState = "closed";
  for (const c of spikes(run)) {
    const dt = t - c;
    if (dt < 0) continue;
    na = dt < RISE ? "open" : dt < REPOLARIZED ? "inactivated" : "closed";
    if (dt >= K_OPEN && dt < K_CLOSE) k = "open";
  }
  return { na, k };
}

export type Phase = "rest" | "stimulus" | "depolarization" | "repolarization" | "hyperpolarization";

/** The phase of the action potential at time t. */
export function phaseAt(run: Run | null, t: number): Phase {
  if (!run) return "rest";
  let phase: Phase = "rest";
  for (const s of run.stimuli) {
    if (t < s.at) continue;
    if (s.crossing !== null && t >= s.crossing) {
      const dt = t - s.crossing;
      phase = dt < RISE ? "depolarization" : dt < RISE + FALL ? (voltageAt(run, t) >= REST ? "repolarization" : "hyperpolarization") : dt < RECOVERED ? "hyperpolarization" : "rest";
    } else if (s.outcome !== "absolute-refractory" && t < s.at + STIM_RISE + 2 * LOCAL_DECAY) {
      if (s.crossing !== null || phase === "rest") phase = "stimulus";
    }
  }
  return phase;
}

/** A moment inside each phase of the first action potential, for the step-through stills. */
export function phaseMoments(run: Run | null): Record<"rest" | "depolarization" | "repolarization" | "hyperpolarization", number> | null {
  const c = spikes(run)[0];
  if (c === undefined) return null;
  return { rest: 0.4, depolarization: c + RISE * 0.6, repolarization: c + RISE + (REPOLARIZED - RISE) * 0.55, hyperpolarization: c + RISE + FALL + 0.4 };
}

/** The trace as points, every `dt` ms from 0 to WINDOW_MS. */
export function sampleTrace(run: Run | null, dt = 0.025): { t: number; v: number }[] {
  const n = Math.round(WINDOW_MS / dt);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i * dt;
    return { t, v: voltageAt(run, t) };
  });
}

/** Spike windows for the shaded refractory bands on the trace (ms). */
export function refractoryBands(run: Run | null): { kind: "absolute" | "relative"; from: number; to: number }[] {
  return spikes(run).flatMap((c) => [
    { kind: "absolute" as const, from: c, to: c + REPOLARIZED },
    { kind: "relative" as const, from: c + REPOLARIZED, to: c + RECOVERED },
  ]);
}

// ------------------------------------------------------------------ conduction along the axon

/** Nodes of Ranvier along the stretch of axon drawn, as fractions of its length. */
export const NODES = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1];

/**
 * Seconds of animation for the impulse to cross the drawn axon. Stylized: slowed down for viewing,
 * and only the order matters (myelinated is faster).
 */
export const TRAVEL_S = { unmyelinated: 4.2, myelinated: 1.4 } as const;

/**
 * Where the impulse is, `s` seconds after it was sent. Unmyelinated: a front sliding along the
 * membrane. Myelinated: regenerated only at the nodes of Ranvier, one node after another (saltatory
 * conduction); between nodes the depolarization spreads quickly under the myelin.
 */
export function conductionAt(s: number, myelin: boolean): { front: number; node: number | null; done: boolean } {
  const total = myelin ? TRAVEL_S.myelinated : TRAVEL_S.unmyelinated;
  const u = Math.min(1, Math.max(0, s / total));
  if (!myelin) return { front: u, node: null, done: s >= total };
  const hops = NODES.length - 1;
  const node = Math.min(hops, Math.floor(u * hops + 1e-9));
  return { front: NODES[node], node, done: s >= total };
}

/**
 * Ions crossing the membrane at time t, as progress 0..1 through their channel: Na⁺ inward while
 * its channels are open, K⁺ outward while its channels are open. The concentrations on either side
 * barely change during one action potential, so the figure keeps them constant.
 */
export function fluxAt(run: Run | null, t: number): { na: number[]; k: number[] } {
  const na: number[] = [];
  const k: number[] = [];
  for (const c of spikes(run)) {
    for (let i = 0; i < 5; i++) {
      const p = (t - c - i * 0.07) / 0.3;
      if (p > 0 && p < 1) na.push(p);
    }
    for (let i = 0; i < 6; i++) {
      const p = (t - c - K_OPEN - i * 0.45) / 0.8;
      if (p > 0 && p < 1) k.push(p);
    }
  }
  return { na, k };
}
