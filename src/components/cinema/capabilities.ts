"use client";

import { useSyncExternalStore } from "react";

// What the device can do, read without effects (useSyncExternalStore), so the
// server render and first client render agree and nothing flips mid-hydration.

function media(query: string) {
  return {
    subscribe(cb: () => void) {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    get: () => window.matchMedia(query).matches,
  };
}

const reduced = media("(prefers-reduced-motion: reduce)");
const wide = media("(min-width: 768px)");

let webgl: boolean | undefined;
function hasWebGL() {
  if (webgl === undefined) {
    try {
      const c = document.createElement("canvas");
      const gl = (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGLRenderingContext | null;
      webgl = Boolean(gl && !gl.isContextLost());
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

const noop = () => () => {};

export type StageMode = "pending" | "live" | "static";

/** live: render the 3D molecule. static: show the pre-rendered image and diagrams. */
export function useStageMode(): { mode: StageMode; wide: boolean; reduced: boolean; lowPower: boolean } {
  const isReduced = useSyncExternalStore(reduced.subscribe, reduced.get, () => false);
  const isWide = useSyncExternalStore(wide.subscribe, wide.get, () => true);
  const gl = useSyncExternalStore(noop, hasWebGL, () => true);
  const cores = useSyncExternalStore(noop, () => navigator.hardwareConcurrency ?? 8, () => 8);
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const lowPower = !isWide && cores <= 4;
  if (!mounted) return { mode: "pending", wide: isWide, reduced: isReduced, lowPower };
  return { mode: isReduced || !gl || lowPower ? "static" : "live", wide: isWide, reduced: isReduced, lowPower };
}
