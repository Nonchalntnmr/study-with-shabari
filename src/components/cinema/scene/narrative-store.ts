// Shared, mutable, outside React: scroll and pointer state read every frame by the
// 3D scene. Writing to it never re-renders anything.

export type Marks = { hero: number; a: number; b: number; c: number };
export type Chapter = keyof Marks;

export const narrative = {
  /** Raw scroll progress through hero + story, 0..1. */
  progress: 0,
  /** Damped copy the scene actually uses, so wheel steps never jitter. */
  smoothed: 0,
  /** Progress at which each chapter's panel is centred in the viewport (measured from the DOM). */
  marks: { hero: 0, a: 0.34, b: 0.67, c: 1 } as Marks,
  /** Linked to the scroll story (desktop). On mobile the hero model just turns. */
  linked: true,
  reducedMotion: false,
  /** Where the VTA dot of the pathway figure sits on screen, in normalised device coordinates. */
  vta: { x: 0.35, y: -0.2 },
  drag: { yaw: 0, pitch: 0, active: false },
  /** Right edge of the text column per scene, as a fraction of the viewport width (measured). */
  textRight: { hero: 0.52, a: 0.42, b: 0.52 },
  /** The model's current position and lowest point, so the contact shadow can sit under it. */
  model: { x: 0, y: 0, bottom: -2, width: 8 },
  /** Camera distance chosen by the model's framing for the current scene. */
  cameraZ: 20,
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => x * x * (3 - 2 * x);

/** How strongly each chapter is "on" at progress p. Neighbouring chapters cross-fade. */
export function chapterWeights(p: number, m: Marks): Record<Chapter, number> {
  const order: Chapter[] = ["hero", "a", "b", "c"];
  const out = { hero: 0, a: 0, b: 0, c: 0 } as Record<Chapter, number>;
  for (let i = 0; i < order.length; i++) {
    const at = m[order[i]];
    const prev = i > 0 ? m[order[i - 1]] : -Infinity;
    const next = i < order.length - 1 ? m[order[i + 1]] : Infinity;
    if (p <= at) out[order[i]] = i === 0 ? 1 : smooth(clamp01((p - prev) / (at - prev)));
    else out[order[i]] = i === order.length - 1 ? 1 : smooth(clamp01(1 - (p - at) / (next - at)));
  }
  return out;
}
