"use client";

import { useSyncExternalStore } from "react";

// What the device can do, for the explorers. Unlike the cinema's useStageMode, reduced motion doesn't turn
// 3D off here: it only removes animation (no fly-to, no autorotate). Read without effects, so the server
// render and the first client render agree.

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
const coarse = media("(pointer: coarse)");
const narrow = media("(max-width: 767px)");

let webgl: boolean | undefined;
function hasWebGL() {
  if (webgl === undefined) {
    try {
      const c = document.createElement("canvas");
      webgl = Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

const noop = () => () => {};

type NavigatorHints = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

export type ExplorerCaps = {
  mounted: boolean;
  /** WebGL and DecompressionStream (the models are gzipped files the browser unpacks itself). */
  live: boolean;
  reducedMotion: boolean;
  /** Touch-first: 3D waits for a tap on "Explore in 3D", so the canvas never traps page scrolling. */
  coarse: boolean;
  tier: "mobile" | "desktop";
  /** Highest device-pixel ratio the canvas may use. */
  dprCap: number;
};

export function useExplorerCaps(): ExplorerCaps {
  const isReduced = useSyncExternalStore(reduced.subscribe, reduced.get, () => false);
  const isCoarse = useSyncExternalStore(coarse.subscribe, coarse.get, () => false);
  const isNarrow = useSyncExternalStore(narrow.subscribe, narrow.get, () => false);
  const gl = useSyncExternalStore(noop, hasWebGL, () => false);
  const decompress = useSyncExternalStore(noop, () => typeof DecompressionStream === "function", () => false);
  const light = useSyncExternalStore(
    noop,
    () => {
      const n = navigator as NavigatorHints;
      return Boolean(n.connection?.saveData) || (n.deviceMemory !== undefined && n.deviceMemory <= 4) || (navigator.hardwareConcurrency ?? 8) <= 4;
    },
    () => false,
  );
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const tier = isCoarse || isNarrow || light ? "mobile" : "desktop";
  return { mounted, live: mounted && gl && decompress, reducedMotion: isReduced, coarse: isCoarse, tier, dprCap: tier === "mobile" ? 1.5 : 2 };
}
