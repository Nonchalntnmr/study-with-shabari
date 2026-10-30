import { damp } from "@/lib/experience/timeline";

// Mutable state shared between a scroll story's DOM and its WebGL scene, read every frame.
// Writing to it never re-renders React. Components change it only through the functions below,
// so the store stays an ordinary object that React treats as a stable value.

export type StoryStore = {
  /** Raw scroll progress through the story, 0..1. */
  progress: number;
  /** Damped copy the scene uses, so wheel steps never jitter. */
  smoothed: number;
  /** Progress at which each beat's step is centred on the reading line (measured from the DOM). */
  marks: number[];
  /** Pointer drag, in radians; springs back when released. */
  turn: { yaw: number; pitch: number; dragging: boolean };
  /** Keyboard turns, in radians; they stay until reset. */
  held: { yaw: number; pitch: number };
  /** Scene-specific switches (for example, DAT blocked). */
  flags: Record<string, boolean>;
  /** Layout the scene is framed for. */
  wide: boolean;
};

export function createStore(beats: number): StoryStore {
  return {
    progress: 0,
    smoothed: 0,
    marks: Array.from({ length: beats }, (_, i) => (beats <= 1 ? 0 : i / (beats - 1))),
    turn: { yaw: 0, pitch: 0, dragging: false },
    held: { yaw: 0, pitch: 0 },
    flags: {},
    wide: true,
  };
}

export function setLayout(s: StoryStore, marks: number[], wide: boolean) {
  if (marks.length) s.marks = marks;
  s.wide = wide;
}

export function setProgress(s: StoryStore, p: number) {
  s.progress = p;
}

/** Damp the scene's copy of progress toward the scroll position; returns it. */
export function advance(s: StoryStore, dt: number, k = 4.5): number {
  s.smoothed = damp(s.smoothed, s.progress, k, dt);
  return s.smoothed;
}

export function dragTo(s: StoryStore, yaw: number, pitch: number) {
  s.turn.yaw = yaw;
  s.turn.pitch = pitch;
}

export function setDragging(s: StoryStore, on: boolean) {
  s.turn.dragging = on;
}

/** Let a released drag spring back. */
export function decayTurn(s: StoryStore, dt: number) {
  if (s.turn.dragging) return;
  const k = Math.exp(-dt * 3.5);
  s.turn.yaw *= k;
  s.turn.pitch *= k;
}

export function nudge(s: StoryStore, yaw: number, pitch: number) {
  s.held.yaw = Math.max(-1.6, Math.min(1.6, s.held.yaw + yaw));
  s.held.pitch = Math.max(-0.8, Math.min(0.8, s.held.pitch + pitch));
}

export function resetTurn(s: StoryStore) {
  s.held.yaw = 0;
  s.held.pitch = 0;
}

export function setFlag(s: StoryStore, key: string, on: boolean) {
  s.flags[key] = on;
}
