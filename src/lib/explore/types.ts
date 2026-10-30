// Shared shape of the 3D explorers (/explore/brain, /explore/anatomy). Pure data: the page, the region list,
// the WebGL-off fallback and the 3D scene all read the same config, so they can't disagree.

/** A direction from the target to the camera, in the model's frame (x: subject's left, y: up, z: front). */
export type ViewDir = readonly [number, number, number];

/** How one class of meshes is drawn in a layer. */
export type AtomMode = "solid" | "ghost" | "hidden";

export type ExplorerLayer = {
  id: string;
  label: string;
  /** Per mesh class (see ExplorerConfig.atomClass). Classes not listed are solid. */
  modes: Readonly<Record<string, AtomMode>>;
  /** The still shown when WebGL is off, rendered from this layer's default view. */
  still: { src: string; alt: string };
};

export type ExplorerRegion = {
  id: string;
  name: string;
  group: string;
  layer: string;
  /** Mesh names drawn as this region. */
  atoms: readonly string[];
  /** Meshes that select this region when clicked in its layer (default: atoms). */
  pick?: readonly string[];
  color: string;
  view: ViewDir;
  /** Ghost the other surface meshes while selected, to show something folded or deep. */
  xray?: boolean;
  /** Point markers drawn instead of meshes (the brain's VTA has no mesh of its own). */
  markers?: readonly (readonly [number, number, number])[];
  /** Why this is an approximation of the real structure, shown with it. */
  approximate?: string;
  /** e.g. "Shown on the left hemisphere". */
  side?: string;
  /** New sentences, each logged in docs/STAGE-TEXT-FOR-SHABARI.md. */
  note: readonly string[];
  /** Verbatim lines from Shabari's dopamine lesson (src/app/(site)/dopamine/page.tsx). */
  lesson?: readonly string[];
  /** Other regions this one works with (shown as links in the details panel). */
  related?: readonly string[];
};

export type ExplorerConfig = {
  id: string;
  /** Name of the model, for the stage's accessible label. */
  modelName: string;
  groups: readonly { id: string; label: string }[];
  layers: readonly ExplorerLayer[];
  regions: readonly ExplorerRegion[];
  /** Mesh class by mesh name. */
  atomClass: (atom: string) => string;
  /** Classes whose unselected meshes become ghosts when an x-ray region is selected. */
  xrayClasses: readonly string[];
  defaultView: ViewDir;
  defaultLayer: string;
  assets: { mobile: { gz: string; gzBytes: number; triangles: number }; desktop: { gz: string; gzBytes: number; triangles: number } };
  /** Pale colour for meshes that aren't part of the current layer or selection. */
  neutral: string;
};

/** Which region a mesh selects in a layer: the layer's own regions first, then the fallback layer. */
export function pickMap(config: ExplorerConfig): Map<string, Map<string, string>> {
  const byLayer = new Map<string, Map<string, string>>();
  for (const layer of config.layers) byLayer.set(layer.id, new Map());
  for (const r of config.regions) {
    const m = byLayer.get(r.layer)!;
    for (const a of r.pick ?? r.atoms) if (!m.has(a)) m.set(a, r.id);
  }
  return byLayer;
}

export function regionById(config: ExplorerConfig, id: string | null | undefined): ExplorerRegion | undefined {
  return id ? config.regions.find((r) => r.id === id) : undefined;
}
