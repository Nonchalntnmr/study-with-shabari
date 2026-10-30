import { describe, expect, it } from "vitest";
import { MOLECULES, benzeneRing, formulaOf, keyBondLengths, ringBondLengths, roles } from "@/lib/molecules/analyze";

describe("PubChem molecule data", () => {
  it("atom lists match PubChem's formulas, in 3D and 2D", () => {
    for (const m of Object.values(MOLECULES)) {
      expect(formulaOf(m.atoms3d), m.name).toBe(m.formula);
      expect(formulaOf(m.atoms2d), m.name).toBe(m.formula);
    }
    expect(MOLECULES.dopamine).toMatchObject({ cid: 681, formula: "C8H11NO2", name: "Dopamine" });
    expect(MOLECULES.tyrosine).toMatchObject({ cid: 6057, formula: "C9H11NO3", name: "L-Tyrosine" });
    expect(MOLECULES.levodopa).toMatchObject({ cid: 6047, formula: "C9H11NO4", name: "Levodopa" });
  });

  it("finds one six-carbon ring in each molecule", () => {
    for (const m of Object.values(MOLECULES)) {
      const ring = benzeneRing(m);
      expect(ring, m.name).toHaveLength(6);
      expect(ring.every((i) => m.atoms3d[i].el === "C")).toBe(true);
    }
  });

  it("dopamine and L-DOPA are catechols; tyrosine has one ring hydroxyl", () => {
    expect(roles(MOLECULES.dopamine).ringOxygens).toHaveLength(2);
    expect(roles(MOLECULES.levodopa).ringOxygens).toHaveLength(2);
    expect(roles(MOLECULES.tyrosine).ringOxygens).toHaveLength(1);
  });

  it("the hydroxyl tyrosine hydroxylase adds is meta to the side chain, and tyrosine lacks it", () => {
    const d = roles(MOLECULES.dopamine);
    expect(d.addedByTyrosineHydroxylase.map((i) => MOLECULES.dopamine.atoms3d[i].el).sort()).toEqual(["H", "O"]);
    expect(roles(MOLECULES.tyrosine).addedByTyrosineHydroxylase).toEqual([]);
  });

  it("dopamine's amine is a primary amine (N with two H)", () => {
    const a = roles(MOLECULES.dopamine).amine.map((i) => MOLECULES.dopamine.atoms3d[i].el);
    expect(a).toEqual(["N", "H", "H"]);
  });

  it("measured bond lengths are chemically sensible", () => {
    const [cc, co, cn] = keyBondLengths(MOLECULES.dopamine);
    expect(cc.label).toBe("Aromatic C–C");
    expect(cc.angstrom).toBeGreaterThan(1.38);
    expect(cc.angstrom).toBeLessThan(1.41);
    expect(co.angstrom).toBeGreaterThan(1.34);
    expect(co.angstrom).toBeLessThan(1.38);
    expect(cn.angstrom).toBeGreaterThan(1.44);
    expect(cn.angstrom).toBeLessThan(1.49);
    const ring = ringBondLengths(MOLECULES.dopamine);
    expect(ring).toHaveLength(6);
    expect(Math.max(...ring) - Math.min(...ring)).toBeLessThan(0.02);
  });
});
