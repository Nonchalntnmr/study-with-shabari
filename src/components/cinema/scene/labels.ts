import { MOLECULES, keyBondLengths, roles } from "@/lib/molecules/analyze";

// Annotations drawn over the 3D model as plain DOM, positioned every frame by
// projecting their anchor atoms. Text comes from the measured coordinates.

const dopamine = MOLECULES.dopamine;
const th = roles(dopamine).addedByTyrosineHydroxylase[0];

export type ModelLabel = { text: string; atoms: number[]; chapter: "a" | "b"; tone: "plain" | "accent"; lift: number };

export const MODEL_LABELS: ModelLabel[] = [
  ...keyBondLengths(dopamine).map((m) => ({
    text: `${m.label.replace("Aromatic ", "")} ${m.angstrom.toFixed(3)} Å`,
    atoms: m.atoms,
    chapter: "a" as const,
    tone: "plain" as const,
    lift: 0,
  })),
  ...(th === undefined ? [] : [{ text: "Added by tyrosine hydroxylase", atoms: [th], chapter: "b" as const, tone: "accent" as const, lift: 34 }]),
];

/** DOM nodes for the labels, filled in by <ModelLabels>, written to by the scene each frame. */
export const labelNodes: (HTMLDivElement | null)[] = [];
