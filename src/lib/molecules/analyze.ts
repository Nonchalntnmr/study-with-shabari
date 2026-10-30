// Chemistry derived from PubChem coordinates, never typed in by hand. Every label
// the site shows about a molecule (bond lengths, which atoms form the ring, which
// hydroxyl tyrosine hydroxylase adds) is computed here and unit-tested.

import dopamine from "@/content/molecules/dopamine.json";
import levodopa from "@/content/molecules/levodopa.json";
import tyrosine from "@/content/molecules/l-tyrosine.json";

export type Atom3 = { el: string; x: number; y: number; z: number };
export type Atom2 = { el: string; x: number; y: number };
export type MoleculeData = {
  name: string;
  cid: number;
  formula: string;
  molecularWeight: string;
  iupacName: string;
  source: { page: string; conformer3d: string; depiction2d: string; retrieved: string; conformerId: string | null; notes: string };
  atoms3d: Atom3[];
  bonds3d: number[][]; // [a, b, order]
  atoms2d: Atom2[];
  bonds2d: number[][]; // [a, b, order, stereo]
};

export const MOLECULES = {
  dopamine: dopamine as MoleculeData,
  levodopa: levodopa as MoleculeData,
  tyrosine: tyrosine as MoleculeData,
};

export function neighbors(bonds: number[][], count: number): number[][] {
  const out = Array.from({ length: count }, () => [] as number[]);
  for (const [a, b] of bonds) {
    out[a].push(b);
    out[b].push(a);
  }
  return out;
}

/** Hill-system formula from the atom list (C first, H second, then alphabetical). */
export function formulaOf(atoms: { el: string }[]): string {
  const counts = new Map<string, number>();
  for (const a of atoms) counts.set(a.el, (counts.get(a.el) ?? 0) + 1);
  const order = [...counts.keys()].sort((x, y) => (x === "C" ? -1 : y === "C" ? 1 : x === "H" ? -1 : y === "H" ? 1 : x.localeCompare(y)));
  return order.map((el) => `${el}${counts.get(el)! > 1 ? counts.get(el) : ""}`).join("");
}

/** The six-membered carbon ring, found by searching for a 6-cycle of carbons. */
export function benzeneRing(m: MoleculeData): number[] {
  const nb = neighbors(m.bonds3d, m.atoms3d.length);
  const isC = (i: number) => m.atoms3d[i].el === "C";
  for (let start = 0; start < m.atoms3d.length; start++) {
    if (!isC(start)) continue;
    const stack: number[][] = [[start]];
    while (stack.length) {
      const path = stack.pop()!;
      const last = path[path.length - 1];
      for (const n of nb[last]) {
        if (!isC(n)) continue;
        if (path.length === 6 && n === start) return path;
        if (path.length < 6 && !path.includes(n)) stack.push([...path, n]);
      }
    }
  }
  return [];
}

const distance = (a: Atom3, b: Atom3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export type Roles = {
  ring: number[];
  ringAnchor: number; // ring carbon carrying the side chain
  ringOxygens: number[]; // hydroxyl oxygens on the ring
  hydroxylHydrogens: number[];
  amine: number[]; // N and its hydrogens
  sideChain: number[]; // non-ring heavy atoms that aren't hydroxyl O (and their H)
  /** The ring hydroxyl meta to the side chain: the one tyrosine hydroxylase adds (O and its H). */
  addedByTyrosineHydroxylase: number[];
};

export function roles(m: MoleculeData): Roles {
  const atoms = m.atoms3d;
  const nb = neighbors(m.bonds3d, atoms.length);
  const ring = benzeneRing(m);
  const inRing = new Set(ring);
  const ringAnchor = ring.find((r) => nb[r].some((n) => !inRing.has(n) && atoms[n].el === "C"))!;
  const ringOxygens = ring.flatMap((r) => nb[r].filter((n) => atoms[n].el === "O"));
  const hydroxylHydrogens = ringOxygens.flatMap((o) => nb[o].filter((n) => atoms[n].el === "H"));
  const n = atoms.findIndex((a) => a.el === "N");
  const amine = [n, ...nb[n].filter((x) => atoms[x].el === "H")];

  // Ring position of each atom counted from the anchor (1 = anchor, 4 = para).
  const ringDistance = (target: number) => {
    const i = ring.indexOf(ringAnchor);
    const j = ring.indexOf(target);
    const d = Math.abs(i - j);
    return Math.min(d, 6 - d);
  };
  const metaCarbon = ring.find((r) => ringDistance(r) === 2 && nb[r].some((x) => atoms[x].el === "O"));
  const metaO = metaCarbon !== undefined ? nb[metaCarbon].find((x) => atoms[x].el === "O") : undefined;
  const addedByTyrosineHydroxylase = metaO === undefined ? [] : [metaO, ...nb[metaO].filter((x) => atoms[x].el === "H")];

  const taken = new Set([...ring, ...ringOxygens, ...hydroxylHydrogens]);
  const sideChain = atoms
    .map((_, i) => i)
    .filter((i) => !taken.has(i) && (atoms[i].el !== "H" || !taken.has(nb[i][0])) && !ring.some((r) => nb[r].includes(i) && atoms[i].el === "H"));

  return { ring, ringAnchor, ringOxygens, hydroxylHydrogens, amine, sideChain, addedByTyrosineHydroxylase };
}

export type BondMeasure = { label: string; atoms: [number, number]; angstrom: number };

/** Representative bond lengths, measured from the conformer. */
export function keyBondLengths(m: MoleculeData): BondMeasure[] {
  const atoms = m.atoms3d;
  const r = roles(m);
  const ringSet = new Set(r.ring);
  const find = (pred: (a: number, b: number) => boolean) => m.bonds3d.find(([a, b]) => pred(a, b) || pred(b, a)) as [number, number] | undefined;
  const cc = find((a, b) => ringSet.has(a) && ringSet.has(b));
  const co = find((a, b) => ringSet.has(a) && atoms[b].el === "O");
  const cn = find((a, b) => atoms[a].el === "C" && atoms[b].el === "N");
  const out: BondMeasure[] = [];
  if (cc) out.push({ label: "Aromatic C–C", atoms: [cc[0], cc[1]], angstrom: distance(atoms[cc[0]], atoms[cc[1]]) });
  if (co) out.push({ label: "Ring C–O", atoms: [co[0], co[1]], angstrom: distance(atoms[co[0]], atoms[co[1]]) });
  if (cn) out.push({ label: "C–N", atoms: [cn[0], cn[1]], angstrom: distance(atoms[cn[0]], atoms[cn[1]]) });
  return out;
}

/** All six ring bonds, to show they're (nearly) equal: the signature of aromaticity. */
export function ringBondLengths(m: MoleculeData): number[] {
  const ringSet = new Set(roles(m).ring);
  return m.bonds3d.filter(([a, b]) => ringSet.has(a) && ringSet.has(b)).map(([a, b]) => distance(m.atoms3d[a], m.atoms3d[b]));
}

/** Center the molecule on its heavy-atom centroid and return coordinates in ångströms. */
export function centered(m: MoleculeData): Atom3[] {
  const heavy = m.atoms3d.filter((a) => a.el !== "H");
  const c = heavy.reduce((s, a) => ({ x: s.x + a.x / heavy.length, y: s.y + a.y / heavy.length, z: s.z + a.z / heavy.length }), { x: 0, y: 0, z: 0 });
  return m.atoms3d.map((a) => ({ el: a.el, x: a.x - c.x, y: a.y - c.y, z: a.z - c.z }));
}
