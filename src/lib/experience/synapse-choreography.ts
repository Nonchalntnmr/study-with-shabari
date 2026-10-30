import { beatWeights, clamp01, ease, lerp, seeded } from "./timeline";

// The Synapse sequence as numbers. One "phase" runs 0..6 through the beats; every particle's
// position is a pure function of the phase (plus a little thermal jitter added by the scene), so
// scrolling backwards plays the story backwards and the stills always match. Unit-tested.
//
// Local frame: x runs across the synapse, presynaptic terminal at x < 0, postsynaptic at x > 0.
// Units are about 10 nm; molecules are drawn larger than life so they can be seen.

export const SYNAPSE_BEATS = ["molecule", "vesicles", "release", "cleft", "receptors", "reuptake", "whole"] as const;

export type P2 = { x: number; y: number };

export const GEOMETRY = {
  preMembraneX: -1.2,
  postMembraneX: 1.2,
  vesicles: [
    { x: -3.0, y: 0.6, r: 1.0 },
    { x: -4.7, y: 2.7, r: 1.0 },
    { x: -5.1, y: -1.7, r: 1.0 },
    { x: -7.0, y: 0.9, r: 1.0 },
  ],
  /** Where the first vesicle fuses with the membrane. */
  pore: { x: -1.25, y: 0.6 },
  receptors: [
    { kind: "D1" as const, y: 3.0 },
    { kind: "D1" as const, y: 1.6 },
    { kind: "D2" as const, y: -1.6 },
    { kind: "D2" as const, y: -3.0 },
  ],
  transporters: [{ y: 3.6 }, { y: -3.7 }],
  /** Adenylyl cyclase: one beside each pair of receptors. */
  cyclase: [
    { kind: "D1" as const, y: 4.3 },
    { kind: "D2" as const, y: -4.4 },
  ],
};

export const RELEASED = 12;
export const STORED_PER_VESICLE = 7;

/**
 * Continuous position in the sequence: 0 at the first beat … 6 at the last. A story that shows
 * only some beats passes the phase of each (for example [0, 4, 5]): the scene still plays
 * everything between them as the visitor scrolls.
 */
export function phaseOf(p: number, marks: readonly number[], phases?: readonly number[] | null): number {
  return beatWeights(p, marks).reduce((s, w, i) => s + w * (phases?.[i] ?? i), 0);
}

export type ParticlePlan = { slot: P2; cleft: P2; site: number | null; dat: number; inside: P2 };

/** Fixed, seeded plans for the released particles. Four bind a receptor each; the rest hover. */
export function particlePlans(seed = 681): ParticlePlan[] {
  const r = seeded(seed);
  const v = GEOMETRY.vesicles[0];
  return Array.from({ length: RELEASED }, (_, i) => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * v.r * 0.62;
    const dat = i % 2;
    const ty = GEOMETRY.transporters[dat].y;
    return {
      slot: { x: v.x + Math.cos(a) * d, y: v.y + Math.sin(a) * d },
      cleft: { x: lerp(-0.75, 0.75, r()), y: lerp(-3.3, 3.3, r()) },
      site: i < GEOMETRY.receptors.length ? i : null,
      dat,
      inside: { x: lerp(-2.6, -1.9, r()), y: ty + lerp(-0.6, 0.6, r()) * (ty > 0 ? -1 : 1) },
    };
  });
}

const mix = (a: P2, b: P2, t: number): P2 => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

/** Binding site of a receptor: just outside the postsynaptic membrane, on the cleft side. */
export const siteOf = (i: number): P2 => ({ x: GEOMETRY.postMembraneX - 0.3, y: GEOMETRY.receptors[i].y });
const datMouth = (i: number): P2 => ({ x: GEOMETRY.preMembraneX + 0.25, y: GEOMETRY.transporters[i].y });
const datInner = (i: number): P2 => ({ x: GEOMETRY.preMembraneX - 0.35, y: GEOMETRY.transporters[i].y });

/**
 * Where released particle `plan` is at `phase`. With DAT blocked, reuptake never happens:
 * the particles stay in the cleft and bound ones stay bound.
 */
export function particleAt(plan: ParticlePlan, phase: number, datBlocked = false): { at: P2; bound: number; free: number } {
  const release = ease(clamp01((phase - 1.55) / 0.75)); // slot → pore
  const spread = ease(clamp01((phase - 2.2) / 0.8)); // pore → cleft
  const bind = plan.site === null ? 0 : ease(clamp01((phase - 3.1) / 0.7));
  const unbind = datBlocked ? 0 : ease(clamp01((phase - 4.25) / 0.35));
  const toDat = datBlocked ? 0 : ease(clamp01((phase - 4.35) / 0.55));
  const through = datBlocked ? 0 : ease(clamp01((phase - 4.9) / 0.5));
  const drift = plan.site === null ? ease(clamp01((phase - 3.1) / 0.8)) * 0.35 : 0;

  let at = mix(plan.slot, GEOMETRY.pore, release);
  at = mix(at, plan.cleft, spread);
  at = { x: at.x + drift, y: at.y };
  if (plan.site !== null) at = mix(at, siteOf(plan.site), bind * (1 - unbind));
  at = mix(at, datMouth(plan.dat), toDat);
  at = mix(at, mix(datInner(plan.dat), plan.inside, through), through);
  const bound = plan.site === null ? 0 : bind * (1 - unbind);
  // Free in solution (jitters): out of the vesicle and not held by a receptor or transporter.
  const free = clamp01(spread) * (1 - bound) * (1 - toDat);
  return { at, bound, free };
}

/** How strongly each receptor is occupied at a phase (0..1 per receptor). */
export function occupancy(phase: number, datBlocked = false): number[] {
  const plans = particlePlans();
  const out = GEOMETRY.receptors.map(() => 0);
  for (const p of plans) if (p.site !== null) out[p.site] = Math.max(out[p.site], particleAt(p, phase, datBlocked).bound);
  return out;
}

/**
 * cAMP made beside each receptor type, as a count of particles shown. D1-like receptors are
 * Gs-coupled: occupancy raises cAMP above baseline. D2-like are Gi-coupled: occupancy lowers it.
 */
export const CAMP_BASE = 5;
export const CAMP_MAX = 14;
export function campCounts(phase: number, datBlocked = false): { D1: number; D2: number } {
  const occ = occupancy(phase, datBlocked);
  const d1 = (occ[0] + occ[1]) / 2;
  const d2 = (occ[2] + occ[3]) / 2;
  return { D1: CAMP_BASE + (CAMP_MAX - CAMP_BASE) * d1, D2: CAMP_BASE * (1 - 0.8 * d2) };
}

/** How far the first vesicle has gone toward fusing (0 resting … 1 fused into the membrane). */
export const fusion = (phase: number) => ease(clamp01((phase - 1.25) / 0.9));

/** The action potential's position along the terminal (0 far up the axon … 1 at the release site). */
export const spike = (phase: number) => clamp01((phase - 1.05) / 0.55);

/** Which still stands in for the scene at each beat when WebGL is off. */
export const synapseStill = (beat: number) => Math.min(SYNAPSE_BEATS.length - 1, Math.max(0, beat));
