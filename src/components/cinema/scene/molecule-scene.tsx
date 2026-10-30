"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, MathUtils, type Mesh, type MeshBasicMaterial, PMREMGenerator, type PerspectiveCamera, Vector3 } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MoleculeModel } from "./molecule-model";
import { FOV } from "./poses";
import { chapterWeights, narrative } from "./narrative-store";

/** Neutral studio reflections, generated locally (no HDR download). */
function Studio() {
  // Read the three.js objects through get() inside the effect: they are mutable scene state, not React values.
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { gl, scene } = get();
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [get]);
  return null;
}

/** One continuous camera move: the distance comes from each scene's framing (molecule-model.tsx). */
function Rig() {
  const camera = useThree((s) => s.camera as PerspectiveCamera);
  const target = useRef(new Vector3());
  useFrame((s, dt) => {
    // Critically damped follow of scroll: smooth on trackpads and wheels alike.
    const k = narrative.reducedMotion ? 1 : 1 - Math.exp(-dt * 3.4);
    narrative.smoothed += (narrative.progress - narrative.smoothed) * k;
    target.current.set(narrative.reducedMotion ? 0 : s.pointer.x * 0.35, narrative.reducedMotion ? 0 : s.pointer.y * 0.2, narrative.cameraZ);
    camera.position.lerp(target.current, k);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/** A tight, neutral contact shadow just under the model's lowest point. No extra render pass. */
function Shadow() {
  const ref = useRef<Mesh>(null);
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(128, 32, 0, 128, 32, 128);
    grad.addColorStop(0, "rgba(21,26,40,0.12)");
    grad.addColorStop(0.35, "rgba(21,26,40,0.06)");
    grad.addColorStop(1, "rgba(21,26,40,0)");
    g.setTransform(1, 0, 0, 0.25, 0, 24);
    g.fillStyle = grad;
    g.fillRect(0, -96, 256, 256);
    return new CanvasTexture(c);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(() => {
    const w = narrative.linked ? chapterWeights(narrative.smoothed, narrative.marks) : { hero: 1, a: 0, b: 0, c: 0 };
    const m = ref.current;
    if (!m) return;
    m.position.set(narrative.model.x, narrative.model.bottom - 0.45, -0.6);
    m.scale.set(narrative.model.width * 0.85, narrative.model.width * 0.85 * 0.25, 1);
    (m.material as MeshBasicMaterial).opacity = 1 - MathUtils.smoothstep(w.c, 0.05, 0.38);
  });
  return (
    <mesh ref={ref}>
      <planeGeometry />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

export default function MoleculeScene({ layout, lowPower, running, onReady }: { layout: "wide" | "narrow"; lowPower: boolean; running: boolean; onReady: () => void }) {
  return (
    <Canvas
      dpr={[1, lowPower ? 1.25 : 1.75]}
      frameloop={running ? "always" : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: layout === "wide" ? FOV.wide : FOV.narrow, position: [0, 0, 20], near: 0.1, far: 120 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        requestAnimationFrame(onReady);
      }}
    >
      <Studio />
      <hemisphereLight args={["#ffffff", "#dfe5ee", 0.95]} />
      <directionalLight position={[-5, 8, 7]} intensity={2.3} />
      <directionalLight position={[6, 2, -5]} intensity={0.7} color="#E8EEFA" />
      <MoleculeModel layout={layout} />
      <Shadow />
      <Rig />
    </Canvas>
  );
}
