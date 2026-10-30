// Scroll choreography shared by the /experience scenes. Pure functions, unit-tested in
// tests/unit/experience-timeline.test.ts.

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Smoothstep easing: zero slope at both ends, so nothing lurches when a beat starts or stops. */
export const ease = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * How strongly each beat is "on" at progress p, given the progress at which each beat is centred
 * (ascending). Neighbouring beats cross-fade, the weights always sum to 1, the first beat holds
 * before its mark and the last holds after its mark.
 */
export function beatWeights(p: number, marks: readonly number[]): number[] {
  const n = marks.length;
  const out = new Array<number>(n).fill(0);
  if (n === 0) return out;
  if (p <= marks[0]) {
    out[0] = 1;
    return out;
  }
  if (p >= marks[n - 1]) {
    out[n - 1] = 1;
    return out;
  }
  for (let i = 0; i < n - 1; i++) {
    if (p >= marks[i] && p <= marks[i + 1]) {
      const span = marks[i + 1] - marks[i];
      const t = span <= 0 ? 1 : ease((p - marks[i]) / span);
      out[i] = 1 - t;
      out[i + 1] = t;
      return out;
    }
  }
  return out;
}

/** Progress through the window [a, b] of the timeline, eased and clamped to 0..1. */
export const span = (p: number, a: number, b: number) => ease((p - a) / Math.max(1e-6, b - a));

/** The beat whose weight is largest (ties go to the later beat, so captions advance on the midpoint). */
export function activeBeat(p: number, marks: readonly number[]): number {
  const w = beatWeights(p, marks);
  let best = 0;
  for (let i = 1; i < w.length; i++) if (w[i] >= w[best]) best = i;
  return best;
}

/**
 * Evenly spaced beat marks for n beats, with the first at `start` and the last at `end`. The page
 * lays out one tall step per beat, so each beat is centred on its step.
 */
export function evenMarks(n: number, start = 0, end = 1): number[] {
  if (n <= 1) return [start];
  return Array.from({ length: n }, (_, i) => start + ((end - start) * i) / (n - 1));
}

/** Frame-rate independent damping toward a target (k per second). */
export const damp = (current: number, target: number, k: number, dt: number) => current + (target - current) * (1 - Math.exp(-k * dt));

/** Deterministic pseudo-random numbers in [0, 1) for particle layouts (mulberry32). */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
