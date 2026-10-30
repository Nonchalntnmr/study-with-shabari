"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

/**
 * Adaptive resolution for a <Canvas>: starts at the device's pixel ratio (capped at `max`), steps
 * down by 0.25 when frames average slower than 45 fps, and back up after a few calm seconds at
 * 57 fps or better. Rendering fewer pixels is the cheapest quality cut on a slow GPU.
 */
export function AdaptiveDpr({ min = 1, max }: { min?: number; max: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const device = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const ceiling = Math.max(min, Math.min(max, device));
  const st = useRef({ dpr: ceiling, sum: 0, n: 0, calm: 0 });
  useEffect(() => {
    st.current.dpr = ceiling;
    setDpr(ceiling);
  }, [ceiling, setDpr]);
  useFrame((_, dt) => {
    const s = st.current;
    if (dt <= 0 || dt > 0.25) return; // first frame, or the tab was hidden
    s.sum += dt;
    s.n += 1;
    if (s.n < 30) return;
    const avg = s.sum / s.n;
    s.sum = 0;
    s.n = 0;
    if (avg > 1 / 45 && s.dpr > min) {
      s.dpr = Math.max(min, s.dpr - 0.25);
      s.calm = 0;
      setDpr(s.dpr);
    } else if (avg < 1 / 57 && s.dpr < ceiling) {
      if (++s.calm >= 4) {
        s.dpr = Math.min(ceiling, s.dpr + 0.25);
        s.calm = 0;
        setDpr(s.dpr);
      }
    } else s.calm = 0;
  });
  return null;
}
