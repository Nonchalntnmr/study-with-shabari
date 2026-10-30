"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useStageMode } from "./capabilities";
import { ModelLabels } from "./model-labels";
import { narrative } from "./scene/narrative-store";

const MoleculeScene = dynamic(() => import("./scene/molecule-scene"), { ssr: false });

/**
 * The 3D dopamine model, or its pre-rendered still. The still is always painted
 * first, so the page never waits on WebGL and never flashes empty.
 */
export function MoleculeStage({ linked, className = "" }: { linked: boolean; className?: string }) {
  const { mode, wide, lowPower } = useStageMode();
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    narrative.linked = linked && wide;
    narrative.reducedMotion = mode === "static";
  }, [linked, wide, mode]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Drag to turn the model; it springs back when released.
  useEffect(() => {
    const el = box.current;
    if (!el || mode !== "live") return;
    let x0 = 0;
    let y0 = 0;
    const down = (e: PointerEvent) => {
      narrative.drag.active = true;
      x0 = e.clientX;
      y0 = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!narrative.drag.active) return;
      narrative.drag.yaw = Math.max(-1.2, Math.min(1.2, (e.clientX - x0) / 180));
      narrative.drag.pitch = Math.max(-0.6, Math.min(0.6, (e.clientY - y0) / 260));
    };
    const up = () => {
      narrative.drag.active = false;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [mode]);

  return (
    <div ref={box} className={`touch-pan-y ${mode === "live" ? "cursor-grab active:cursor-grabbing" : ""} ${className}`} aria-hidden>
      <div className="relative h-full w-full">
      {/* Rendered from this same scene (scripts/render-posters.mjs). Full stage on desktop so the hand-off to WebGL doesn't jump. */}
      <Image
        src={wide && linked ? "/images/dopamine-model.png" : "/images/dopamine-model-tight.png"}
        alt=""
        fill
        // Eager and high priority, but no <link rel=preload>: once WebGL takes over the poster is hidden and Chrome would flag the preload as unused.
        loading="eager"
        fetchPriority="high"
        sizes={wide && linked ? "100vw" : "(min-width: 768px) 50vw, 100vw"}
        className={`pointer-events-none transition-opacity duration-700 ${wide && linked ? "object-cover object-right" : "object-contain"} ${mode === "live" && ready ? "opacity-0" : "opacity-100"}`}
      />
      {mode === "live" && (
        <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
          <MoleculeScene layout={wide && linked ? "wide" : "narrow"} lowPower={lowPower} running={visible} onReady={() => setReady(true)} />
          {wide && linked && <ModelLabels />}
        </div>
      )}
      </div>
    </div>
  );
}
