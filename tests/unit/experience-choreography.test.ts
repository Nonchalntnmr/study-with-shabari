import { describe, expect, it } from "vitest";
import { SPECIMEN_BEATS, specimenState, specimenStill } from "@/lib/experience/specimen-choreography";
import { CAMP_BASE, GEOMETRY, RELEASED, campCounts, fusion, occupancy, particleAt, particlePlans, phaseOf, spike } from "@/lib/experience/synapse-choreography";
import { evenMarks } from "@/lib/experience/timeline";

describe("Specimen choreography", () => {
  const marks = evenMarks(SPECIMEN_BEATS.length);
  const at = (beat: (typeof SPECIMEN_BEATS)[number]) => specimenState(marks[SPECIMEN_BEATS.indexOf(beat)], marks);

  it("is assembled in the hero and at the end, fully exploded through the middle three beats", () => {
    expect(at("hero").explode).toBe(0);
    expect(at("closer").explode).toBe(0);
    for (const b of ["exploded", "proton", "achiral"] as const) expect(at(b).explode).toBe(1);
    expect(at("whole").explode).toBe(0);
  });

  it("adds the proton at the pH 7.4 beat and keeps it (the molecule as it is in the body)", () => {
    expect(at("exploded").proton).toBe(0);
    expect(at("proton").proton).toBe(1);
    expect(at("whole").proton).toBe(1);
    let last = -1;
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const s = specimenState(p, marks);
      expect(s.proton).toBeGreaterThanOrEqual(last - 1e-12);
      last = s.proton;
      for (const v of Object.values(s)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1 + 1e-12);
      }
    }
  });

  it("points out the CH₂ carbons only in the achiral beat", () => {
    expect(at("achiral").achiral).toBe(1);
    for (const b of ["hero", "exploded", "proton", "whole"] as const) expect(at(b).achiral).toBe(0);
  });

  it("chooses stills that match the scene", () => {
    expect(specimenStill(0).kind).toBe("poster");
    expect(specimenStill(2)).toEqual({ kind: "exploded", protonated: false, achiral: false });
    expect(specimenStill(3)).toEqual({ kind: "exploded", protonated: true, achiral: false });
    expect(specimenStill(4)).toEqual({ kind: "exploded", protonated: true, achiral: true });
    expect(specimenStill(5)).toEqual({ kind: "assembled", protonated: true, achiral: false });
  });
});

describe("Synapse choreography", () => {
  const plans = particlePlans();
  const pre = GEOMETRY.preMembraneX;
  const post = GEOMETRY.postMembraneX;

  it("phase runs 0..6 with the scroll", () => {
    const marks = evenMarks(7);
    expect(phaseOf(0, marks)).toBe(0);
    expect(phaseOf(1, marks)).toBe(6);
    expect(phaseOf(marks[3], marks)).toBeCloseTo(3, 12);
  });

  it("starts every released molecule inside its vesicle", () => {
    const v = GEOMETRY.vesicles[0];
    expect(plans).toHaveLength(RELEASED);
    for (const p of plans) {
      const { at } = particleAt(p, 0);
      expect(Math.hypot(at.x - v.x, at.y - v.y)).toBeLessThan(v.r);
    }
  });

  it("puts them in the cleft by the cleft beat, between the two membranes", () => {
    for (const p of plans) {
      const { at } = particleAt(p, 3);
      expect(at.x).toBeGreaterThan(pre);
      expect(at.x).toBeLessThan(post);
    }
  });

  it("binds four receptors at the receptor beat, and releases them for reuptake", () => {
    expect(occupancy(0)).toEqual([0, 0, 0, 0]);
    for (const o of occupancy(4)) expect(o).toBeCloseTo(1, 6);
    expect(occupancy(6)).toEqual([0, 0, 0, 0]);
  });

  it("takes every molecule back into the presynaptic terminal through DAT", () => {
    for (const p of plans) expect(particleAt(p, 6).at.x).toBeLessThan(pre);
  });

  it("with DAT blocked, nothing is taken back up and the receptors stay bound", () => {
    for (const p of plans) {
      const { at } = particleAt(p, 6, true);
      expect(at.x).toBeGreaterThan(pre);
    }
    for (const o of occupancy(6, true)) expect(o).toBeCloseTo(1, 6);
  });

  it("D1 (Gs) raises cAMP above baseline and D2 (Gi) lowers it, only while bound", () => {
    expect(campCounts(0)).toEqual({ D1: CAMP_BASE, D2: CAMP_BASE });
    const bound = campCounts(4);
    expect(bound.D1).toBeGreaterThan(CAMP_BASE);
    expect(bound.D2).toBeLessThan(CAMP_BASE);
    expect(campCounts(6)).toEqual({ D1: CAMP_BASE, D2: CAMP_BASE });
  });

  it("the action potential arrives before the vesicle fuses, and fusion completes by the release beat", () => {
    expect(spike(1.6)).toBe(1);
    expect(fusion(1.2)).toBe(0);
    expect(fusion(2.2)).toBe(1);
  });
});
