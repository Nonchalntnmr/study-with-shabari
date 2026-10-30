"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { CanvasTexture, Color, type Group, type InstancedMesh, MathUtils, Matrix4, type Mesh, type MeshPhysicalMaterial, PMREMGenerator, type PerspectiveCamera, Quaternion, Vector3 } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { REST, RING_VIEW } from "@/components/cinema/scene/poses";
import { DISPLAY_RADIUS, DOPAMINE, type GroupId } from "@/lib/experience/structure";
import { specimenState } from "@/lib/experience/specimen-choreography";
import { damp, ease, lerp } from "@/lib/experience/timeline";
import { MOLECULES } from "@/lib/molecules/analyze";
import { type SceneProps, registerRenderer } from "../gl-stage";
import { type StoryStore, advance, decayTurn } from "../story-store";
import { SPECIMEN_LABELS, type SpecimenLabel } from "./specimen-labels";

// The Specimen: dopamine from PubChem CID 681 as a lit object on ivory. Scroll moves the camera in
// and takes the molecule apart by functional group along vectors computed in
// src/lib/experience/structure.ts, adds the proton the amine carries at pH 7.4, points out why it is
// achiral, then puts it back together. 1 scene unit = 1 Å.

const m = MOLECULES.dopamine;
const COLOR: Record<string, string> = { C: "#1B2A5C", O: "#6A4FD6", N: "#0E9F9A", H: "#F7F9FC" };
const DIM = new Color("#CFCBC2");
const BOND = new Color("#BFC6D2");
const PROTON = m.atoms3d.length; // index of the added H
const N = DOPAMINE.nitrogen;
const Y = new Vector3(0, 1, 0);
const X = new Vector3(1, 0, 0);

type Bond = { a: number; b: number; order: number; cut: boolean; side: number };

function useData() {
  return useMemo(() => {
    const e = DOPAMINE.explosion;
    const group: GroupId[] = [];
    for (const g of e.groups) for (const i of g.atoms) group[i] = g.id;
    group[PROTON] = "chain";
    const base = [...DOPAMINE.atoms.map((a) => new Vector3(a.x, a.y, a.z)), new Vector3(DOPAMINE.proton.x, DOPAMINE.proton.y, DOPAMINE.proton.z)];
    const el = [...m.atoms3d.map((a) => a.el), "H"];
    const disp = Object.fromEntries(Object.entries(e.displacement).map(([k, v]) => [k, new Vector3(v.x, v.y, v.z)])) as Record<GroupId, Vector3>;
    const cuts = new Set(e.groups.filter((g) => g.cut).map((g) => `${Math.min(...g.cut!)}-${Math.max(...g.cut!)}`));
    const bonds: Bond[] = [];
    for (const [a, b, order] of m.bonds3d) {
      const cut = cuts.has(`${Math.min(a, b)}-${Math.max(a, b)}`);
      if (order === 2) bonds.push({ a, b, order, cut, side: 1 }, { a, b, order, cut, side: -1 });
      else bonds.push({ a, b, order, cut, side: 0 });
    }
    bonds.push({ a: N, b: PROTON, order: 1, cut: false, side: 0 });
    const ring = e.groups.find((g) => g.id === "ring")!.heavy;
    const [p0, p1, p2] = ring.slice(0, 3).map((i) => base[i]);
    const ringNormal = new Vector3().subVectors(p1, p0).cross(new Vector3().subVectors(p2, p0)).normalize();
    // The proton arrives from the solvent along the lone pair's direction.
    const approach = base[PROTON].clone().sub(base[N]).normalize();
    // The two side-chain carbons and their hydrogens: what the "achiral" beat points at.
    const chainCarbons = e.groups.find((g) => g.id === "chain")!.heavy.filter((i) => el[i] === "C");
    const chainSet = new Set(chainCarbons);
    for (const [a, b] of m.bonds3d) {
      if (chainCarbons.includes(a) && el[b] === "H") chainSet.add(b);
      if (chainCarbons.includes(b) && el[a] === "H") chainSet.add(a);
    }
    return { group, base, el, disp, bonds, ringNormal, approach, chainSet };
  }, []);
}

function Studio() {
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

const tmp = {
  m: new Matrix4(),
  q: new Quaternion(),
  qa: new Quaternion(),
  qb: new Quaternion(),
  qt: new Quaternion(),
  v: new Vector3(),
  w: new Vector3(),
  s: new Vector3(),
  c: new Color(),
};

function Model({ store, onFrame }: { store: StoryStore; onFrame: (pos: Vector3[], g: Group, dt: number) => void }) {
  const d = useData();
  const atoms = useRef<InstancedMesh>(null);
  const bonds = useRef<InstancedMesh>(null);
  const ghosts = useRef<InstancedMesh>(null);
  const ghostMat = useRef<MeshPhysicalMaterial>(null);
  const group = useRef<Group>(null);
  const pos = useMemo(() => d.base.map((v) => v.clone()), [d]);
  const colors = useMemo(() => d.el.map((e) => new Color(COLOR[e] ?? "#999")), [d]);
  const cutBonds = useMemo(() => d.bonds.filter((b) => b.cut), [d]);
  const look = useRef({ yaw: 0, pitch: 0 });

  useLayoutEffect(() => {
    d.el.forEach((_, i) => atoms.current!.setColorAt(i, colors[i]));
    d.bonds.forEach((_, i) => bonds.current!.setColorAt(i, BOND));
    atoms.current!.instanceColor!.needsUpdate = true;
    bonds.current!.instanceColor!.needsUpdate = true;
  }, [d, colors]);

  useFrame((s, dt) => {
    const g = group.current;
    if (!g || !atoms.current || !bonds.current || !ghosts.current) return;
    const st = specimenState(advance(store, dt), store.marks);
    const t = s.clock.elapsedTime;

    // Positions: each group along its own computed vector; the proton in from the solvent.
    const ex = ease(st.explode);
    for (let i = 0; i < PROTON; i++) pos[i].copy(d.base[i]).addScaledVector(d.disp[d.group[i]], ex);
    const pr = ease(st.proton);
    pos[PROTON].copy(d.base[PROTON]).addScaledVector(d.disp.chain, ex).addScaledVector(d.approach, (1 - pr) * 7);

    for (let i = 0; i <= PROTON; i++) {
      const r = (DISPLAY_RADIUS[d.el[i]] ?? 0.3) * (i === PROTON ? MathUtils.smoothstep(st.proton, 0.02, 0.2) : 1);
      atoms.current.setMatrixAt(i, tmp.m.compose(pos[i], tmp.q.identity(), tmp.s.set(r, r, r)));
      const dim = st.achiral * (d.chainSet.has(i) ? 0 : 0.7);
      tmp.c.copy(colors[i]).lerp(DIM, dim);
      atoms.current.setColorAt(i, tmp.c);
    }
    atoms.current.instanceMatrix.needsUpdate = true;
    atoms.current.instanceColor!.needsUpdate = true;

    const cutFade = 1 - MathUtils.smoothstep(st.explode, 0.04, 0.3);
    const nhForm = MathUtils.smoothstep(st.proton, 0.82, 1);
    const ghost = { i: 0 };
    d.bonds.forEach((b, i) => {
      const A = pos[b.a];
      const B = pos[b.b];
      tmp.v.subVectors(B, A);
      const l = tmp.v.length();
      tmp.w.crossVectors(tmp.v, d.ringNormal).normalize().multiplyScalar(0.11 * b.side);
      const base = b.order === 2 ? 0.062 : 0.09;
      const radius = base * (b.cut ? cutFade : 1) * (b.b === PROTON ? nhForm : 1);
      tmp.q.setFromUnitVectors(Y, tmp.v.normalize());
      tmp.s.set(radius, l, radius);
      tmp.v.addVectors(A, B).multiplyScalar(0.5).add(tmp.w);
      bonds.current!.setMatrixAt(i, tmp.m.compose(tmp.v, tmp.q, tmp.s));
      if (b.cut && b.side >= 0) {
        // The broken bond, kept as a faint thread so you can see where each part reattaches.
        tmp.s.set(0.028, l, 0.028);
        ghosts.current!.setMatrixAt(ghost.i++, tmp.m.compose(tmp.v, tmp.q, tmp.s));
      }
    });
    bonds.current.instanceMatrix.needsUpdate = true;
    ghosts.current.instanceMatrix.needsUpdate = true;
    if (ghostMat.current) ghostMat.current.opacity = 0.55 * MathUtils.smoothstep(st.explode, 0.08, 0.5);

    // Orientation: the computed rest pose (rocking gently) turning to the ring face-on.
    const rock = 1 - st.faceOn;
    tmp.qa.setFromAxisAngle(Y, Math.sin(t * 0.32) * 0.12 * rock).multiply(tmp.qt.setFromAxisAngle(X, Math.sin(t * 0.21 + 1) * 0.05 * rock)).multiply(REST.q);
    tmp.qb.copy(RING_VIEW.q);
    tmp.q.copy(tmp.qa).slerp(tmp.qb, ease(st.faceOn));
    decayTurn(store, dt);
    look.current.yaw = damp(look.current.yaw, store.held.yaw + store.turn.yaw, 8, dt);
    look.current.pitch = damp(look.current.pitch, store.held.pitch + store.turn.pitch, 8, dt);
    tmp.q.premultiply(tmp.qt.setFromAxisAngle(Y, look.current.yaw)).premultiply(tmp.qt.setFromAxisAngle(X, look.current.pitch));
    g.quaternion.slerp(tmp.q, 1 - Math.exp(-dt * 7));

    onFrame(pos, g, dt);
  });

  return (
    <group ref={group}>
      <instancedMesh ref={atoms} args={[undefined, undefined, PROTON + 1]} frustumCulled={false}>
        <sphereGeometry args={[1, 36, 36]} />
        <meshPhysicalMaterial roughness={0.42} metalness={0} clearcoat={0.4} clearcoatRoughness={0.35} envMapIntensity={0.55} sheen={0.2} sheenRoughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={bonds} args={[undefined, undefined, d.bonds.length]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 16, 1]} />
        <meshPhysicalMaterial roughness={0.5} metalness={0} clearcoat={0.2} envMapIntensity={0.4} />
      </instancedMesh>
      <instancedMesh ref={ghosts} args={[undefined, undefined, cutBonds.filter((b) => b.side >= 0).length]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 8, 1]} />
        <meshPhysicalMaterial ref={ghostMat} color="#8C93A8" transparent opacity={0} depthWrite={false} roughness={0.8} />
      </instancedMesh>
    </group>
  );
}

/** Camera: fits the model's current (exploded) extent into its share of the canvas, then moves in. */
function useFraming(store: StoryStore) {
  const camera = useThree((s) => s.camera as PerspectiveCamera);
  const size = useThree((s) => s.size);
  return useMemo(() => {
    return (pos: Vector3[], g: Group, closeness: number, withProton: boolean, dt: number) => {
      const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
      // The incoming proton only counts once it has arrived; on its way in it may be off screen.
      for (let i = 0; i < (withProton ? pos.length : PROTON); i++) {
        tmp.v.copy(pos[i]).applyQuaternion(g.quaternion);
        box.x0 = Math.min(box.x0, tmp.v.x - 0.4);
        box.x1 = Math.max(box.x1, tmp.v.x + 0.4);
        box.y0 = Math.min(box.y0, tmp.v.y - 0.4);
        box.y1 = Math.max(box.y1, tmp.v.y + 0.4);
      }
      const w = box.x1 - box.x0;
      const h = box.y1 - box.y0;
      const aspect = size.width / Math.max(1, size.height);
      const wide = store.wide;
      // Desktop: right of the caption column. Phone: the upper part of the screen, above the caption.
      const u = wide ? lerp(0.66, 0.64, closeness) : 0.5;
      const v = 0.5;
      const fillW = wide ? lerp(0.46, 0.6, closeness) : lerp(0.66, 0.76, closeness);
      const fillH = wide ? lerp(0.6, 0.76, closeness) : lerp(0.6, 0.7, closeness);
      const tn = Math.tan((camera.fov * Math.PI) / 360);
      const z = Math.max((w * 1.12) / (fillW * 2 * tn * aspect), (h * 1.12) / (fillH * 2 * tn));
      const halfH = z * tn;
      const halfW = halfH * aspect;
      const k = 1 - Math.exp(-dt * 4);
      camera.position.setZ(camera.position.z + (z - camera.position.z) * k);
      g.position.set(
        g.position.x + ((u * 2 - 1) * halfW - (box.x0 + box.x1) / 2 - g.position.x) * k,
        g.position.y + ((1 - v * 2) * halfH - (box.y0 + box.y1) / 2 - g.position.y) * k,
        0,
      );
      camera.lookAt(0, 0, 0);
      return { bottom: g.position.y + box.y0, width: w };
    };
  }, [camera, size, store]);
}

function Shadow({ state }: { state: React.RefObject<{ bottom: number; x: number; width: number }> }) {
  const ref = useRef<Mesh>(null);
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(128, 32, 0, 128, 32, 128);
    grad.addColorStop(0, "rgba(40,32,20,0.16)");
    grad.addColorStop(0.4, "rgba(40,32,20,0.06)");
    grad.addColorStop(1, "rgba(40,32,20,0)");
    g.setTransform(1, 0, 0, 0.25, 0, 24);
    g.fillStyle = grad;
    g.fillRect(0, -96, 256, 256);
    return new CanvasTexture(c);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const st = state.current;
    mesh.position.set(st.x, st.bottom - 0.6, -1);
    mesh.scale.set(st.width * 0.9, st.width * 0.22, 1);
  });
  return (
    <mesh ref={ref}>
      <planeGeometry />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

function Rig({ store }: { store: StoryStore }) {
  const fit = useFraming(store);
  const shadow = useRef({ bottom: -3, x: 0, width: 8 });
  const project = useLabels();
  return (
    <>
      <Model
        store={store}
        onFrame={(pos, g, dt) => {
          const st = specimenState(store.smoothed, store.marks);
          const f = fit(pos, g, st.closeness, st.proton > 0.9, dt);
          shadow.current.bottom = f.bottom;
          shadow.current.x = g.position.x;
          shadow.current.width = f.width;
          project(pos, g, st);
        }}
      />
      <Shadow state={shadow} />
    </>
  );
}

// ------------------------------------------------------------------ labels (plain DOM, projected each frame)

const labelNodes: (HTMLDivElement | null)[] = [];

function useLabels() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const disp = useMemo(() => {
    const e = DOPAMINE.explosion.displacement;
    return Object.fromEntries(Object.entries(e).map(([k, v]) => [k, new Vector3(v.x, v.y, v.z)])) as Record<GroupId, Vector3>;
  }, []);
  return useMemo(() => {
    const p = new Vector3();
    const dir = new Vector3();
    const sx = (v: Vector3) => (v.x * 0.5 + 0.5) * size.width;
    const sy = (v: Vector3) => (-v.y * 0.5 + 0.5) * size.height;
    return (pos: Vector3[], g: Group, st: ReturnType<typeof specimenState>) => {
      SPECIMEN_LABELS.forEach((l: SpecimenLabel, i) => {
        const el = labelNodes[i];
        if (!el) return;
        const opacity = Math.max(0, Math.min(1, l.show(st)));
        el.style.opacity = String(opacity);
        if (opacity <= 0) return;
        // Anchor: the centroid of the label's atoms, or its topmost/bottommost atom on screen.
        let x = 0;
        let y = 0;
        let best = l.dir === "up" ? Infinity : -Infinity;
        for (const a of l.atoms) {
          p.copy(pos[a === -1 ? PROTON : a]);
          g.localToWorld(p).project(camera);
          const ax = sx(p);
          const ay = sy(p);
          if (l.dir === "up" || l.dir === "down") {
            if ((l.dir === "up" && ay < best) || (l.dir === "down" && ay > best)) {
              best = ay;
              y = ay;
            }
            x += ax / l.atoms.length;
          } else {
            x += ax / l.atoms.length;
            y += ay / l.atoms.length;
          }
        }
        // Direction on screen: straight up or down, or the group's own direction of travel.
        let ux = 0;
        let uy = l.dir === "up" ? -1 : l.dir === "down" ? 1 : 0;
        if (l.dir !== "up" && l.dir !== "down" && l.dir !== "none") {
          dir.copy(disp[l.dir]).applyQuaternion(g.quaternion);
          const n = Math.hypot(dir.x, dir.y) || 1;
          ux = dir.x / n;
          uy = -dir.y / n;
        }
        const w = el.offsetWidth || 120;
        const h = el.offsetHeight || 32;
        const atom = 15; // about one atom radius on screen
        const reach = l.dir === "none" ? 0 : atom + l.push + Math.abs(ux) * (w / 2) + Math.abs(uy) * (h / 2);
        x = Math.min(size.width - w / 2 - 8, Math.max(w / 2 + 8, x + ux * reach));
        y = Math.min(size.height - h / 2 - 8, Math.max(h / 2 + 8, y + uy * reach));
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      });
    };
  }, [camera, size, disp]);
}

function Labels() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {SPECIMEN_LABELS.map((l, i) => (
        <div
          key={l.id}
          ref={(el) => {
            labelNodes[i] = el;
          }}
          style={{ opacity: 0 }}
          className={
            l.tone === "chip"
              ? "absolute left-0 top-0 grid size-6 place-items-center rounded-full bg-white/95 text-[12px] font-semibold text-hema shadow-sm ring-1 ring-black/5"
              : `absolute left-0 top-0 max-w-[15rem] rounded-lg px-3 py-1.5 text-[12.5px] leading-snug shadow-sm ${l.tone === "accent" ? "bg-hema text-white" : l.tone === "teal" ? "border border-[#0E9F9A]/50 bg-[#F1FAF9] text-[#0B5F5B]" : "border border-[color:var(--exp-rule)] bg-[#FFFDF8] text-hema"}`
          }
        >
          <span className="flex items-center gap-1.5 font-semibold">
            {l.swatch?.map((e) => <span key={e} className="inline-block size-2 rounded-full ring-1 ring-white/70" style={{ background: COLOR[e] }} />)}
            {l.text}
          </span>
          {l.sub && <span data-phone={l.phoneSub ? "keep" : "hide"} className={`exp-label-sub block ${l.tone === "accent" ? "text-white/85" : l.tone === "teal" ? "text-[#0B5F5B]" : "text-[color:var(--exp-quiet)]"}`}>{l.sub}</span>}
        </div>
      ))}
    </div>
  );
}

export default function SpecimenScene({ store, lowPower, running, onReady }: SceneProps) {
  return (
    <>
      <Canvas
        dpr={[1, lowPower ? 1.25 : 1.75]}
        frameloop={running ? "always" : "never"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: 30, position: [0, 0, 22], near: 0.1, far: 200 }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          registerRenderer("specimen", gl);
          requestAnimationFrame(onReady);
        }}
      >
        <Studio />
        <hemisphereLight args={["#fffdf8", "#e9e2d4", 0.9]} />
        <directionalLight position={[-6, 9, 8]} intensity={2.4} color="#fff8ec" />
        <directionalLight position={[7, 1, -6]} intensity={0.8} color="#e6ecfa" />
        <Rig store={store} />
      </Canvas>
      <Labels />
    </>
  );
}
