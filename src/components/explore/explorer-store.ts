"use client";

// One small external store per explorer: the region list, the details panel, the fallback still and the 3D
// scene all read and write it, so a pick in the canvas and a press in the list are the same action.

export type ExplorerState = {
  selected: string | null;
  /** Pointer hover in the canvas, or keyboard focus / mouse hover in the list. */
  hovered: string | null;
  layer: string;
  /** Bumped by "Reset view", so the scene can fly home even when nothing else changed. */
  resets: number;
};

export type ExplorerCommand = { type: "rotate"; azimuth: number; polar: number } | { type: "zoom"; factor: number } | { type: "reset" };

export type ExplorerStore = ReturnType<typeof createExplorerStore>;

export function createExplorerStore(initial: ExplorerState) {
  let state = initial;
  const listeners = new Set<() => void>();
  const commands = new Set<(c: ExplorerCommand) => void>();
  /** DOM label elements the scene positions over the canvas (aria-hidden; the list carries the names). */
  const labels: { selected: HTMLElement | null; hovered: HTMLElement | null } = { selected: null, hovered: null };
  return {
    get: () => state,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    set(patch: Partial<ExplorerState>) {
      const next = { ...state, ...patch };
      if (Object.keys(patch).every((k) => next[k as keyof ExplorerState] === state[k as keyof ExplorerState])) return;
      state = next;
      for (const fn of listeners) fn();
    },
    send(c: ExplorerCommand) {
      for (const fn of commands) fn(c);
    },
    onCommand(fn: (c: ExplorerCommand) => void) {
      commands.add(fn);
      return () => commands.delete(fn);
    },
    labels,
  };
}
