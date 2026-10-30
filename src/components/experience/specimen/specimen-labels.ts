import type { SpecimenState } from "@/lib/experience/specimen-choreography";
import { DOPAMINE, functionalGroups } from "@/lib/experience/structure";
import { MOLECULES, neighbors } from "@/lib/molecules/analyze";

// What the Specimen labels say, and which atoms each one is pinned to. Element identities, group
// membership and the stereocentre count all come from the structure; the pKa and the charge are
// the numbers in Shabari's lesson ("Its amine (pKa ≈ 10) is protonated at physiological pH, so it
// carries a +1 charge").

const m = MOLECULES.dopamine;
const groups = Object.fromEntries(functionalGroups(m).map((g) => [g.id, g]));
const nb = neighbors(m.bonds3d, m.atoms3d.length);
const chainCarbons = groups.chain.heavy.filter((i) => m.atoms3d[i].el === "C");
const hOn = (i: number) => nb[i].filter((n) => m.atoms3d[n].el === "H").length;
const allCH2 = chainCarbons.every((c) => hOn(c) === 2);
const withH = (xs: number[]) => [...xs, ...xs.flatMap((i) => nb[i].filter((n) => m.atoms3d[n].el === "H"))];

export type SpecimenLabel = {
  id: string;
  text: string;
  sub?: string;
  /** Atom indices to pin to (their centroid); -1 is the added proton. */
  atoms: number[];
  /** Pixels of clear space between the anchor and the label's nearest edge. */
  push: number;
  /** Which way the label sits from its anchor: along a group's direction of travel, or straight up or down. */
  dir: "oh3" | "oh4" | "chain" | "ring" | "up" | "down" | "none";
  tone: "plain" | "accent" | "teal" | "chip";
  /** Element colours of the atoms named, the same as the model's. */
  swatch?: ("C" | "O" | "N")[];
  /** Keep the second line on a phone (the rest show their title only). */
  phoneSub?: boolean;
  show: (s: SpecimenState) => number;
};

const o3 = groups.oh3.heavy[0];
const o4 = groups.oh4.heavy[0];
const arriving = (s: SpecimenState) => Math.min(1, s.proton * 10) * (1 - Math.min(1, Math.max(0, (s.proton - 0.75) / 0.2)));

export const SPECIMEN_LABELS: SpecimenLabel[] = [
  { id: "ring", text: "Benzene ring", sub: "C₆, aromatic: the catechol’s core", atoms: groups.ring.atoms, push: 12, dir: "up", tone: "plain", swatch: ["C"], show: (s) => s.groupLabels },
  { id: "oh3", text: "3-OH", sub: "added by tyrosine hydroxylase", atoms: [o3], push: 18, dir: "oh3", tone: "plain", swatch: ["O"], show: (s) => s.groupLabels },
  { id: "oh4", text: "4-OH", sub: "already on tyrosine", atoms: [o4], push: 18, dir: "oh4", tone: "plain", swatch: ["O"], show: (s) => s.groupLabels },
  { id: "chain", text: "Ethylamine side chain", sub: "–CH₂–CH₂–N", atoms: withH(chainCarbons), push: 12, dir: "down", tone: "plain", swatch: ["C", "N"], show: (s) => Math.max(0, s.groupLabels - s.achiral * 2) },
  { id: "amine", text: "–NH₃⁺", sub: "pKa ≈ 10, +1 at pH 7.4", atoms: [...withH([DOPAMINE.nitrogen]), -1], push: 12, dir: "up", tone: "accent", swatch: ["N"], phoneSub: true, show: (s) => Math.max(0, (s.proton - 0.85) / 0.15) * (1 - s.achiral * 0.6) },
  { id: "proton", text: "H⁺", atoms: [-1], push: 0, dir: "none", tone: "chip", show: arriving },
  {
    id: "achiral",
    text: DOPAMINE.stereocenters.length === 0 ? "Achiral" : "Chiral",
    sub: allCH2 ? "both side-chain carbons are CH₂: no stereocenter" : undefined,
    atoms: withH(chainCarbons),
    push: 12,
    dir: "down",
    tone: "teal",
    phoneSub: true,
    show: (s) => s.achiral,
  },
];
