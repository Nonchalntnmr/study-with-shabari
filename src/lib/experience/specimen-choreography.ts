import { beatWeights } from "./timeline";

// The Specimen sequence as numbers: which beat does what, from the beat weights alone, so the
// scene, the labels and the still figures always agree. Unit-tested.

export const SPECIMEN_BEATS = ["hero", "closer", "exploded", "proton", "achiral", "whole"] as const;
export type SpecimenBeat = (typeof SPECIMEN_BEATS)[number];

export type SpecimenState = {
  /** 0 assembled … 1 fully exploded. */
  explode: number;
  /** 0 the conformer as PubChem gives it (–NH₂) … 1 the proton in place (–NH₃⁺, pH 7.4). */
  proton: number;
  /** Emphasis on the two CH₂ carbons (no stereocentre). */
  achiral: number;
  /** 0 the hero's three-quarter rest pose … 1 the ring face-on. */
  faceOn: number;
  /** 0 hero framing … 1 close framing. */
  closeness: number;
  /** Labels for the groups (ring, hydroxyls, side chain). */
  groupLabels: number;
};

export function specimenState(p: number, marks: readonly number[]): SpecimenState {
  const w = beatWeights(p, marks);
  const [, closer, exploded, proton, achiral, whole] = w;
  return {
    explode: exploded + proton + achiral,
    proton: proton + achiral + whole,
    achiral,
    faceOn: closer + exploded + proton + achiral,
    closeness: closer + exploded + proton + achiral + whole * 0.35,
    groupLabels: exploded + proton * 0.6 + achiral * 0.35,
  };
}

/** Which still stands in for the scene at each beat when WebGL is off. */
export function specimenStill(beat: number): { kind: "poster" | "exploded" | "assembled"; protonated: boolean; achiral: boolean } {
  const id = SPECIMEN_BEATS[beat] ?? "hero";
  if (id === "hero" || id === "closer") return { kind: "poster", protonated: false, achiral: false };
  if (id === "whole") return { kind: "assembled", protonated: true, achiral: false };
  return { kind: "exploded", protonated: id !== "exploded", achiral: id === "achiral" };
}
