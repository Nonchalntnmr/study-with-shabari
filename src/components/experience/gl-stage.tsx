"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Camera, Scene, WebGLRenderer } from "three";
import { useStageMode } from "@/components/cinema/capabilities";
import { type StoryStore, dragTo, nudge, resetTurn, setDragging } from "./story-store";

export type SceneProps = { store: StoryStore; lowPower: boolean; running: boolean; onReady: () => void };

/**
 * Lets an e2e test watch the renderers a page creates (renderer.info.memory, context loss), so
 * resource cleanup on unmount is measured rather than assumed. Inert unless the test defines
 * window.__glProbe before the page loads.
 */
export function registerRenderer(name: string, gl: WebGLRenderer) {
  const w = window as unknown as { __glProbe?: { name: string; gl: WebGLRenderer }[] };
  if (Array.isArray(w.__glProbe)) w.__glProbe.push({ name, gl });
}

/**
 * Drives a demand-mode <Canvas> from the DOM side: one invalidate() per animation frame while
 * `running`. Effects here are cleaned up when the route is hidden (Next keeps visited routes in a
 * hidden <Activity>, and R3F deliberately keeps its root alive there), so a hidden scene stops
 * drawing instead of rendering off screen. Pass the returned callback to Canvas onCreated.
 */
type R3FControl = {
  gl: WebGLRenderer;
  invalidate: () => void;
  setFrameloop: (f: "always" | "demand" | "never") => void;
  internal: { frames: number };
  get?: () => R3FControl;
};

function liveState(ctrl: R3FControl | null): R3FControl | null {
  if (!ctrl) return null;
  return typeof ctrl.get === "function" ? ctrl.get() : ctrl;
}

export function useRenderLoop(running: boolean, name: string, onReady: () => void) {
  const r3f = useRef<R3FControl | null>(null);
  const activeRef = useRef(true);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    if (!created) return;
    const halt = () => {
      activeRef.current = false;
      const s = liveState(r3f.current);
      if (s) {
        s.internal.frames = 0;
        s.setFrameloop("never");
      }
    };
    if (!running) {
      halt();
      return;
    }
    activeRef.current = !document.hidden;
    const s0 = liveState(r3f.current);
    if (s0) {
      s0.setFrameloop(document.hidden ? "never" : "demand");
      if (!document.hidden) s0.invalidate();
    }
    const loop = { f: 0 };
    const tick = () => {
      if (!activeRef.current || document.hidden) return;
      liveState(r3f.current)?.invalidate();
      loop.f = requestAnimationFrame(tick);
    };
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(loop.f);
        halt();
      } else if (running) {
        activeRef.current = true;
        const s = liveState(r3f.current);
        if (s) {
          s.setFrameloop("demand");
          s.invalidate();
        }
        cancelAnimationFrame(loop.f);
        loop.f = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    loop.f = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(loop.f);
      document.removeEventListener("visibilitychange", onVis);
      halt();
    };
  }, [running, created]);

  return useCallback(
    (state: R3FControl) => {
      state.gl.setClearColor(0x000000, 0);
      const origRender = state.gl.render.bind(state.gl);
      state.gl.render = (scene: Scene, camera: Camera) => {
        if (!activeRef.current || document.hidden) return;
        origRender(scene, camera);
      };
      r3f.current = state;
      registerRenderer(name, state.gl);
      setCreated(true);
      requestAnimationFrame(onReady);
    },
    [name, onReady],
  );
}

/**
 * The stage for a WebGL scene. The still (`fallback`) paints first and stays when WebGL is off,
 * motion is reduced or the device is low-powered. The scene's code is only requested once the
 * page has loaded and the browser is idle, so it never competes with first paint, and it stops
 * rendering whenever the stage is off screen.
 */
export function GlStage({
  store,
  Scene,
  fallback,
  className = "",
  lazy = false,
}: {
  store: StoryStore;
  Scene: React.ComponentType<SceneProps>;
  fallback: React.ReactNode;
  className?: string;
  /** Wait until the stage is within a screen of the viewport (for a second scene lower on a page). */
  lazy?: boolean;
}) {
  const { mode, lowPower } = useStageMode();
  const box = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [near, setNear] = useState(!lazy);

  useEffect(() => {
    const el = box.current;
    if (near || !el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "100% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (mode !== "live" || !near) return;
    const t = { idle: 0, timer: 0 };
    const arm = () => {
      if (window.requestIdleCallback) t.idle = window.requestIdleCallback(() => setArmed(true), { timeout: 1500 });
      else t.timer = window.setTimeout(() => setArmed(true), 200);
    };
    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });
    return () => {
      window.removeEventListener("load", arm);
      if (t.idle) window.cancelIdleCallback?.(t.idle);
      clearTimeout(t.timer);
    };
  }, [mode, near]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "160px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Drag to turn; the turn springs back when released (the scene decays it).
  useEffect(() => {
    const el = box.current;
    if (!el || mode !== "live") return;
    const start = { x: 0, y: 0 };
    const down = (e: PointerEvent) => {
      setDragging(store, true);
      start.x = e.clientX;
      start.y = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!store.turn.dragging) return;
      dragTo(store, Math.max(-1.3, Math.min(1.3, (e.clientX - start.x) / 170)), Math.max(-0.7, Math.min(0.7, (e.clientY - start.y) / 240)));
    };
    const up = () => setDragging(store, false);
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
  }, [mode, store]);

  const live = mode === "live" && armed;
  return (
    <div ref={box} data-stage data-stage-mode={mode} data-stage-ready={live && ready ? "true" : "false"} className={`relative h-full w-full touch-pan-y ${mode === "live" ? "cursor-grab active:cursor-grabbing" : ""} ${className}`}>
      <div className={`absolute inset-0 transition-opacity duration-700 ${live && ready ? "opacity-0" : "opacity-100"}`}>{fallback}</div>
      {live && (
        <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
          <Scene store={store} lowPower={lowPower} running={visible} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}

/** Keyboard equivalents for dragging the model: turn it in steps, or put it back. */
export function TurnControls({ store, label = "the model" }: { store: StoryStore; label?: string }) {
  const { mode } = useStageMode();
  const turn = (yaw: number, pitch: number) => nudge(store, yaw, pitch);
  if (mode !== "live") return null;
  const btn = "grid size-10 place-items-center rounded-full border border-[color:var(--exp-rule)] bg-white text-hema hover:border-hema/50";
  return (
    <div
      role="group"
      aria-label={`Turn ${label}`}
      className="flex items-center gap-2"
      onKeyDown={(e) => {
        const k = { ArrowLeft: [-0.25, 0], ArrowRight: [0.25, 0], ArrowUp: [0, -0.2], ArrowDown: [0, 0.2] }[e.key];
        if (k) {
          e.preventDefault();
          turn(k[0], k[1]);
        }
      }}
    >
      <button type="button" className={btn} aria-label={`Turn ${label} left`} onClick={() => turn(-0.3, 0)}>
        <span aria-hidden>←</span>
      </button>
      <button type="button" className={btn} aria-label={`Turn ${label} right`} onClick={() => turn(0.3, 0)}>
        <span aria-hidden>→</span>
      </button>
      <button type="button" className={btn} aria-label={`Tilt ${label}`} onClick={() => turn(0, store.held.pitch > 0.3 ? -0.6 : 0.3)}>
        <span aria-hidden>↕</span>
      </button>
      <button
        type="button"
        className="h-10 rounded-full border border-[color:var(--exp-rule)] bg-white px-4 text-[0.9rem] font-semibold text-hema hover:border-hema/50"
        onClick={() => resetTurn(store)}
      >
        Reset
      </button>
      <span className="ml-1 text-[0.85rem] text-[color:var(--exp-quiet)]">or drag it</span>
    </div>
  );
}
