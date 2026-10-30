import { describe, expect, it } from "vitest";
import { MOLECULES, centered, roles } from "@/lib/molecules/analyze";
import {
  AMINE_PKA,
  DISPLAY_RADIUS,
  DOPAMINE,
  EXPLODE_GAP,
  PHYSIOLOGICAL_PH,
  ammoniumProton,
  dist,
  explodedPositions,
  explosion,
  explosion2d,
  fractionProtonated,
  functionalGroups,
  interGroupClearance,
  stereocenters,
  subscriptFormula,
} from "@/lib/experience/structure";

const dopamine = MOLECULES.dopamine;
const atoms = centered(dopamine);

describe("dopamine functional groups", () => {
  const groups = functionalGroups(dopamine);
  const byId = Object.fromEntries(groups.map((g) => [g.id, g]));

  it("partitions every atom into exactly one of four groups", () => {
    const all = groups.flatMap((g) => g.atoms).sort((a, b) => a - b);
    expect(all).toEqual(dopamine.atoms3d.map((_, i) => i));
    expect(groups.map((g) => g.id)).toEqual(["ring", "oh3", "oh4", "chain"]);
  });

  it("finds the catechol ring (six carbons and their three hydrogens), two hydroxyls, and the ethylamine side chain", () => {
    const el = (xs: number[]) => xs.map((i) => dopamine.atoms3d[i].el).sort().join("");
    expect(el(byId.ring.atoms)).toBe("CCCCCCHHH");
    expect(el(byId.oh3.atoms)).toBe("HO");
    expect(el(byId.oh4.atoms)).toBe("HO");
    // –CH₂–CH₂–NH₂ in the conformer (neutral); the proton is added separately.
    expect(el(byId.chain.atoms)).toBe("CCHHHHHHN");
  });

  it("the 3-OH is the one tyrosine hydroxylase adds (meta to the side chain); the 4-OH is para", () => {
    const r = roles(dopamine);
    expect(byId.oh3.atoms).toEqual(r.addedByTyrosineHydroxylase);
    const ring = r.ring;
    const pos = (c: number) => {
      const d = Math.abs(ring.indexOf(c) - ring.indexOf(r.ringAnchor));
      return Math.min(d, 6 - d);
    };
    expect(pos(byId.oh3.cut![0])).toBe(2);
    expect(pos(byId.oh4.cut![0])).toBe(3);
  });

  it("each substituent is cut at the single bond joining it to the ring", () => {
    const ringSet = new Set(roles(dopamine).ring);
    for (const g of groups.filter((x) => x.cut)) {
      const [a, b] = g.cut!;
      expect(ringSet.has(a)).toBe(true);
      expect(g.atoms).toContain(b);
      expect(dopamine.bonds3d.some(([x, y, order]) => order === 1 && ((x === a && y === b) || (x === b && y === a)))).toBe(true);
    }
  });
});

describe("exploded view", () => {
  const e = explosion();

  it("moves each substituent along its own cut bond, away from the ring", () => {
    for (const g of e.groups.filter((x) => x.cut)) {
      const [a, b] = g.cut!;
      const bond = { x: atoms[b].x - atoms[a].x, y: atoms[b].y - atoms[a].y, z: atoms[b].z - atoms[a].z };
      const l = Math.hypot(bond.x, bond.y, bond.z);
      const d = e.directions[g.id];
      expect((bond.x * d.x + bond.y * d.y + bond.z * d.z) / l).toBeCloseTo(1, 6);
    }
  });

  it("separates the groups by at least the required gap, and the travel is the smallest that does", () => {
    expect(e.clearance).toBeGreaterThanOrEqual(EXPLODE_GAP);
    // Assembled, bonded atoms in neighbouring groups sit well inside the gap.
    expect(interGroupClearance(atoms, e.groups, { ring: z, oh3: z, oh4: z, chain: z })).toBeLessThan(EXPLODE_GAP);
    // One search step less than the travel found (before the fixed extra) would not clear the gap.
    const tooShort = explosion(dopamine, { extra: -0.02 });
    expect(tooShort.clearance).toBeLessThan(EXPLODE_GAP);
    expect(e.travel).toBeGreaterThan(0.8);
    expect(e.travel).toBeLessThan(6);
  });

  it("keeps the heavy-atom centroid fixed, so the framing never moves", () => {
    const p = explodedPositions(atoms, e, 1);
    const heavy = dopamine.atoms3d.map((a, i) => i).filter((i) => dopamine.atoms3d[i].el !== "H");
    const c = heavy.reduce((s, i) => ({ x: s.x + p[i].x, y: s.y + p[i].y, z: s.z + p[i].z }), { x: 0, y: 0, z: 0 });
    expect(Math.hypot(c.x, c.y, c.z) / heavy.length).toBeLessThan(1e-9);
  });

  it("reassembles exactly at t = 0, and every cut bond lengthens monotonically with t", () => {
    const p0 = explodedPositions(atoms, e, 0);
    p0.forEach((p, i) => expect(dist(p, atoms[i])).toBeLessThan(1e-12));
    for (const g of e.groups.filter((x) => x.cut)) {
      const [a, b] = g.cut!;
      let last = -Infinity;
      for (let t = 0; t <= 1.0001; t += 0.1) {
        const p = explodedPositions(atoms, e, t);
        const l = dist(p[a], p[b]);
        expect(l).toBeGreaterThan(last);
        last = l;
      }
    }
  });

  it("the 2D figure uses the same groups and directions as the depiction's cut bonds", () => {
    const e2 = explosion2d();
    expect(e2.groups.map((g) => g.id)).toEqual(e.groups.map((g) => g.id));
    for (const g of e2.groups.filter((x) => x.cut)) expect(Math.hypot(e2.displacement[g.id].x, e2.displacement[g.id].y)).toBeCloseTo(1.15, 6);
  });
});
const z = { x: 0, y: 0, z: 0 };

describe("the protonated amine", () => {
  const p = ammoniumProton(dopamine, atoms);
  const n = dopamine.atoms3d.findIndex((a) => a.el === "N");
  const nbrs = dopamine.bonds3d.filter(([a, b]) => a === n || b === n).map(([a, b]) => (a === n ? b : a));

  it("sits at the conformer's own N–H bond length", () => {
    const hs = nbrs.filter((i) => dopamine.atoms3d[i].el === "H");
    const mean = hs.reduce((s, i) => s + dist(atoms[i], atoms[n]), 0) / hs.length;
    expect(dist(p, atoms[n])).toBeCloseTo(mean, 9);
  });

  it("is close to tetrahedral with all three existing neighbours (100–120°)", () => {
    for (const i of nbrs) {
      const u = { x: atoms[i].x - atoms[n].x, y: atoms[i].y - atoms[n].y, z: atoms[i].z - atoms[n].z };
      const v = { x: p.x - atoms[n].x, y: p.y - atoms[n].y, z: p.z - atoms[n].z };
      const cos = (u.x * v.x + u.y * v.y + u.z * v.z) / (Math.hypot(u.x, u.y, u.z) * Math.hypot(v.x, v.y, v.z));
      const deg = (Math.acos(cos) * 180) / Math.PI;
      expect(deg).toBeGreaterThan(100);
      expect(deg).toBeLessThan(120);
    }
  });

  it("clears every other atom", () => {
    atoms.forEach((a, i) => {
      if (i === n) return;
      expect(dist(a, p) - DISPLAY_RADIUS[a.el] - DISPLAY_RADIUS.H).toBeGreaterThan(0);
    });
  });

  it("gives the formulas the lesson states: C₈H₁₁NO₂, and C₈H₁₂NO₂⁺ once protonated", () => {
    expect(DOPAMINE.neutralFormula).toBe("C8H11NO2");
    expect(DOPAMINE.protonatedFormula).toBe("C8H12NO2");
    expect(subscriptFormula(DOPAMINE.neutralFormula)).toBe("C₈H₁₁NO₂");
  });

  it("is about 99.7% protonated at pH 7.4 with pKa ≈ 10, so the net charge is about +1", () => {
    const f = fractionProtonated(PHYSIOLOGICAL_PH, AMINE_PKA);
    expect(f).toBeGreaterThan(0.99);
    expect(f).toBeCloseTo(0.9975, 4);
    expect(fractionProtonated(AMINE_PKA, AMINE_PKA)).toBeCloseTo(0.5, 12);
  });
});

describe("stereochemistry", () => {
  it("dopamine is achiral: no carbon has four different substituents", () => {
    expect(stereocenters(dopamine)).toEqual([]);
    expect(DOPAMINE.stereocenters).toEqual([]);
  });

  it("L-DOPA and L-tyrosine each have one stereocentre (the α-carbon), so the check is not vacuous", () => {
    expect(stereocenters(MOLECULES.levodopa)).toHaveLength(1);
    expect(stereocenters(MOLECULES.tyrosine)).toHaveLength(1);
  });
});
