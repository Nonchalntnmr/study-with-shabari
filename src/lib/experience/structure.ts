import { type Atom3, type MoleculeData, MOLECULES, centered, formulaOf, neighbors, roles } from "@/lib/molecules/analyze";

// Dopamine taken apart by functional group, computed from PubChem's conformer and the structure
// roles in src/lib/molecules/analyze.ts. Nothing here is placed by hand: the groups come from the
// bond graph, each group moves along the bond that joins it to the ring, the distance is the
// smallest that clears every atom of every other group, and the proton on the amine sits at the
// tetrahedral position left open by the nitrogen's lone pair. Unit-tested in
// tests/unit/experience-structure.test.ts.

export type Vec = { x: number; y: number; z: number };
export type GroupId = "ring" | "oh3" | "oh4" | "chain";

export type Group = {
  id: GroupId;
  atoms: number[];
  /** Heavy atoms only, for centroids and labels. */
  heavy: number[];
  /** The ring atom and the group atom of the bond that is cut to free this group (null for the ring). */
  cut: [number, number] | null;
};

/** van der Waals-style display radii (Å), the same as the 3D model (src/components/cinema/scene/poses.ts). */
export const DISPLAY_RADIUS: Record<string, number> = { C: 0.36, O: 0.38, N: 0.38, H: 0.23 };

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const len = (a: Vec) => Math.hypot(a.x, a.y, a.z);
const unit = (a: Vec): Vec => scale(a, 1 / (len(a) || 1));
export const dist = (a: Vec, b: Vec) => len(sub(a, b));
const centroid = (pts: Vec[]): Vec => scale(pts.reduce(add, { x: 0, y: 0, z: 0 }), 1 / pts.length);

/** The four parts of the exploded view: catechol ring, the two hydroxyls, the ethylamine side chain. */
export function functionalGroups(m: MoleculeData): Group[] {
  const r = roles(m);
  const atoms = m.atoms3d;
  const nb = neighbors(m.bonds3d, atoms.length);
  const ringSet = new Set(r.ring);
  const ringH = r.ring.flatMap((c) => nb[c].filter((n) => atoms[n].el === "H"));
  const o3 = r.addedByTyrosineHydroxylase;
  const o4 = r.ringOxygens.filter((o) => o !== o3[0]).flatMap((o) => [o, ...nb[o].filter((n) => atoms[n].el === "H")]);
  const ringAtomOf = (i: number) => nb[i].find((n) => ringSet.has(n))!;
  const chainRoot = r.sideChain.find((i) => atoms[i].el === "C" && nb[i].includes(r.ringAnchor))!;
  const heavy = (xs: number[]) => xs.filter((i) => atoms[i].el !== "H");
  return [
    { id: "ring", atoms: [...r.ring, ...ringH], heavy: heavy(r.ring), cut: null },
    { id: "oh3", atoms: o3, heavy: heavy(o3), cut: [ringAtomOf(o3[0]), o3[0]] },
    { id: "oh4", atoms: o4, heavy: heavy(o4), cut: [ringAtomOf(o4[0]), o4[0]] },
    { id: "chain", atoms: r.sideChain, heavy: heavy(r.sideChain), cut: [r.ringAnchor, chainRoot] },
  ];
}

/**
 * Where the extra proton of –NH₃⁺ goes: opposite the sum of the unit vectors from N to its three
 * neighbours (the lone pair's direction), at the conformer's own mean N–H bond length.
 */
export function ammoniumProton(m: MoleculeData, atoms: Vec[] = m.atoms3d): Vec {
  const nb = neighbors(m.bonds3d, m.atoms3d.length);
  const n = m.atoms3d.findIndex((a) => a.el === "N");
  const N = atoms[n];
  const toNb = nb[n].map((i) => unit(sub(atoms[i], N)));
  const hs = nb[n].filter((i) => m.atoms3d[i].el === "H");
  const nh = hs.reduce((s, i) => s + dist(atoms[i], N), 0) / hs.length;
  return add(N, scale(unit(scale(toNb.reduce(add, { x: 0, y: 0, z: 0 }), -1)), nh));
}

export type Explosion = {
  groups: Group[];
  /** Unit direction each group travels (for the ring, the balancing direction). */
  directions: Record<GroupId, Vec>;
  /** Full displacement of each group at t = 1, in ångströms. */
  displacement: Record<GroupId, Vec>;
  /** The common travel distance found by the clearance search (Å). */
  travel: number;
  /** Smallest surface-to-surface gap between atoms of different groups at t = 1 (Å). */
  clearance: number;
};

function groupOf(groups: Group[], count: number): GroupId[] {
  const out: GroupId[] = new Array(count);
  for (const g of groups) for (const i of g.atoms) out[i] = g.id;
  return out;
}

function displacementsFor(groups: Group[], dirs: Record<GroupId, Vec>, s: number): Record<GroupId, Vec> {
  // Substituents travel s along their cut bonds; the ring moves the other way, weighted by heavy
  // atoms, so the molecule's heavy-atom centroid (and so the camera's framing) never moves.
  const d = {} as Record<GroupId, Vec>;
  let momentum: Vec = { x: 0, y: 0, z: 0 };
  for (const g of groups) {
    if (g.id === "ring") continue;
    d[g.id] = scale(dirs[g.id], s);
    momentum = add(momentum, scale(d[g.id], g.heavy.length));
  }
  const ring = groups.find((g) => g.id === "ring")!;
  d.ring = scale(momentum, -1 / ring.heavy.length);
  return d;
}

/** Smallest surface-to-surface gap between atoms in different groups, after displacing each group. */
export function interGroupClearance(atoms: Atom3[], groups: Group[], d: Record<GroupId, Vec>, radius = DISPLAY_RADIUS): number {
  const of = groupOf(groups, atoms.length);
  const p = atoms.map((a, i) => add(a, d[of[i]]));
  let min = Infinity;
  for (let i = 0; i < p.length; i++)
    for (let j = i + 1; j < p.length; j++) {
      if (of[i] === of[j]) continue;
      min = Math.min(min, dist(p[i], p[j]) - radius[atoms[i].el] - radius[atoms[j].el]);
    }
  return min;
}

/** Clear space between groups when fully exploded (Å): about one C–C bond, so every cut reads as broken. */
export const EXPLODE_GAP = 1.6;

/**
 * The exploded view. `gap` is the clear space required between any two groups (Å); `extra` is
 * added to the travel found, so each cut bond reads as clearly broken.
 */
export function explosion(m: MoleculeData = MOLECULES.dopamine, { gap = EXPLODE_GAP, extra = 0.8 } = {}): Explosion {
  const atoms = centered(m);
  const groups = functionalGroups(m);
  const ring = groups.find((g) => g.id === "ring")!;
  const ringCenter = centroid(ring.heavy.map((i) => atoms[i]));
  const dirs = {} as Record<GroupId, Vec>;
  for (const g of groups) if (g.cut) dirs[g.id] = unit(sub(atoms[g.cut[1]], atoms[g.cut[0]]));
  // The ring's direction is whatever balances the others; computed after the search.
  let s = 0;
  while (s < 12 && interGroupClearance(atoms, groups, displacementsFor(groups, dirs, s)) < gap) s += 0.02;
  const travel = s + extra;
  const displacement = displacementsFor(groups, dirs, travel);
  dirs.ring = len(displacement.ring) > 1e-9 ? unit(displacement.ring) : unit(sub(ringCenter, centroid(atoms)));
  return { groups, directions: dirs, displacement, travel, clearance: interGroupClearance(atoms, groups, displacement) };
}

/** Atom positions at explosion progress t (0 assembled, 1 fully exploded). */
export function explodedPositions(atoms: Vec[], e: Explosion, t: number): Vec[] {
  const of = groupOf(e.groups, atoms.length);
  return atoms.map((a, i) => add(a, scale(e.displacement[of[i]], t)));
}

// ------------------------------------------------------------------ stereochemistry

/**
 * Stereocentres: sp3 carbons (four neighbours) whose four substituents all differ. Substituents are
 * compared by a canonical signature of the branch (element, then sorted child signatures), so two
 * hydrogens, or two identical branches, are recognised as the same.
 */
export function stereocenters(m: MoleculeData): number[] {
  const atoms = m.atoms3d;
  const nb = neighbors(m.bonds3d, atoms.length);
  const sig = (i: number, from: number, depth: number): string => {
    if (depth === 0) return atoms[i].el;
    const kids = nb[i].filter((n) => n !== from).map((n) => sig(n, i, depth - 1)).sort();
    return `${atoms[i].el}(${kids.join(",")})`;
  };
  return atoms
    .map((a, i) => ({ a, i }))
    .filter(({ a, i }) => a.el === "C" && nb[i].length === 4)
    .filter(({ i }) => new Set(nb[i].map((n) => sig(n, i, 8))).size === 4)
    .map(({ i }) => i);
}

// ------------------------------------------------------------------ acid–base

/** Fraction of an amine protonated at a pH (Henderson–Hasselbalch). */
export const fractionProtonated = (pH: number, pKa: number) => 1 / (1 + 10 ** (pH - pKa));

/** The amine's pKa and the physiological pH as written in Shabari's lesson. */
export const AMINE_PKA = 10;
export const PHYSIOLOGICAL_PH = 7.4;

// ------------------------------------------------------------------ the dopamine facts the scenes label

const dopamine = MOLECULES.dopamine;

export const DOPAMINE = (() => {
  const atoms = centered(dopamine);
  const proton = ammoniumProton(dopamine, atoms);
  return {
    atoms,
    proton,
    explosion: explosion(dopamine),
    neutralFormula: formulaOf(dopamine.atoms3d),
    protonatedFormula: formulaOf([...dopamine.atoms3d, { el: "H" }]),
    stereocenters: stereocenters(dopamine),
    nitrogen: dopamine.atoms3d.findIndex((a) => a.el === "N"),
  };
})();

/** "C8H11NO2" → "C₈H₁₁NO₂". */
export function subscriptFormula(f: string): string {
  const SUB = "₀₁₂₃₄₅₆₇₈₉";
  return f.replace(/\d/g, (d) => SUB[Number(d)]);
}

/** The 2D depiction, exploded by the same groups and the same rule, for the static figure. */
export function explosion2d(m: MoleculeData = MOLECULES.dopamine, travel = 1.15) {
  const groups = functionalGroups(m);
  const a = m.atoms2d;
  const d: Record<GroupId, { x: number; y: number }> = { ring: { x: 0, y: 0 }, oh3: { x: 0, y: 0 }, oh4: { x: 0, y: 0 }, chain: { x: 0, y: 0 } };
  for (const g of groups) {
    if (!g.cut) continue;
    const [r, s] = g.cut;
    const v = { x: a[s].x - a[r].x, y: a[s].y - a[r].y };
    const l = Math.hypot(v.x, v.y) || 1;
    d[g.id] = { x: (v.x / l) * travel, y: (v.y / l) * travel };
  }
  return { groups, displacement: d };
}
