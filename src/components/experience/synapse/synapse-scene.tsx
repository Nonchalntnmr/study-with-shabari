"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  type Group,
  type InstancedMesh,
  Matrix4,
  type Mesh,
  type MeshStandardMaterial,
  type PerspectiveCamera,
  Quaternion,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CAMP_MAX, GEOMETRY, RELEASED, STORED_PER_VESICLE, campCounts, fusion, occupancy, particleAt, particlePlans, phaseOf, spike } from "@/lib/experience/synapse-choreography";
import { DOPAMINE } from "@/lib/experience/structure";
import { clamp01, damp, ease, lerp, seeded } from "@/lib/experience/timeline";
import { MOLECULES } from "@/lib/molecules/analyze";
import { AdaptiveDpr } from "../adaptive-dpr";
import { type SceneProps, useRenderLoop } from "../gl-stage";
import { type StoryStore, advance, decayTurn } from "../story-store";

// The Synapse: the PubChem dopamine model, then the same molecule as one of many in a stylized
// cross-section of a synapse. Every particle is the real molecule (heavy atoms and bonds, merged
// into one geometry and instanced). Positions come from src/lib/experience/synapse-choreography.ts.

const m = MOLECULES.dopamine;
const COLOR: Record<string, string> = { C: "#1B2A5C", O: "#6A4FD6", N: "#0E9F9A", H: "#F2F4F8" };
const RADIUS: Record<string, number> = { C: 0.36, O: 0.38, N: 0.38, H: 0.23 };
const D1 = "#6A4FD6";
const D2 = "#0E9F9A";
const PARTICLE_SCALE = 0.1;
const Y = new Vector3(0, 1, 0);

/** Dopamine as one geometry with vertex colours. `withH` adds the hydrogens (hero model). */
function moleculeGeometry(withH: boolean, detail: number) {
  const atoms = DOPAMINE.atoms;
  const keep = (i: number) => withH || m.atoms3d[i].el !== "H";
  const parts: BufferGeometry[] = [];
  const paint = (g: BufferGeometry, hex: string) => {
    const c = new Color(hex);
    const n = g.getAttribute("position").count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new Float32BufferAttribute(col, 3));
    return g;
  };
  atoms.forEach((a, i) => {
    if (!keep(i)) return;
    const s = new SphereGeometry(RADIUS[a.el] * (withH ? 1 : 1.15), detail, Math.max(6, Math.round(detail * 0.75)));
    s.translate(a.x, a.y, a.z);
    parts.push(paint(s.toNonIndexed(), COLOR[a.el]));
    s.dispose();
  });
  const q = new Quaternion();
  for (const [a, b] of m.bonds3d) {
    if (!keep(a) || !keep(b)) continue;
    const A = new Vector3(atoms[a].x, atoms[a].y, atoms[a].z);
    const B = new Vector3(atoms[b].x, atoms[b].y, atoms[b].z);
    const dir = new Vector3().subVectors(B, A);
    const c = new CylinderGeometry(withH ? 0.09 : 0.14, withH ? 0.09 : 0.14, dir.length(), Math.max(6, Math.round(detail / 2)), 1);
    q.setFromUnitVectors(Y, dir.clone().normalize());
    c.applyQuaternion(q);
    c.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    parts.push(paint(c.toNonIndexed(), "#C3CBD8"));
    c.dispose();
  }
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  merged.computeVertexNormals();
  return merged;
}

/** A membrane in cross-section: two parallel tubes (the two leaflets of the bilayer). */
function membraneCurves(side: -1 | 1) {
  const x = side * 1.2;
  const pts = [
    [side * 10, 6.2],
    [side * 4.5, 5.8],
    [side * 1.7, 4.9],
    [x, 2.6],
    [x, 0],
    [x, -2.6],
    [side * 1.7, -4.9],
    [side * 4.5, -5.8],
    [side * 10, -6.2],
  ];
  const outer = new CatmullRomCurve3(pts.map(([a, b]) => new Vector3(a, b, 0)));
  // Offset the inner leaflet toward the cell's inside along the curve's normal.
  const inner = new CatmullRomCurve3(
    outer.getSpacedPoints(48).map((p, i, arr) => {
      const a = arr[Math.max(0, i - 1)];
      const b = arr[Math.min(arr.length - 1, i + 1)];
      const t = new Vector3().subVectors(b, a).normalize();
      const n = new Vector3(-t.y, t.x, 0).multiplyScalar(side * -0.34);
      return p.clone().add(n);
    }),
  );
  return [outer, inner];
}

const tmp = { m: new Matrix4(), q: new Quaternion(), v: new Vector3(), s: new Vector3(), c: new Color(), e: new Vector3() };

function Synapse({ store, onPhase }: { store: StoryStore; onPhase: (phase: number, world: Group) => void }) {
  const camera = useThree((s) => s.camera as PerspectiveCamera);
  const world = useRef<Group>(null);
  const heroRef = useRef<Mesh>(null);
  const particles = useRef<InstancedMesh>(null);
  const stored = useRef<InstancedMesh>(null);
  const vesicles = useRef<InstancedMesh>(null);
  const camp = useRef<InstancedMesh>(null);
  const ions = useRef<InstancedMesh>(null);
  const pulse = useRef<Mesh>(null);
  const gprot = useRef<InstancedMesh>(null);
  const fade = useRef(new Set<MeshStandardMaterial>());

  const heroGeo = useMemo(() => moleculeGeometry(true, 22), []);
  const miniGeo = useMemo(() => moleculeGeometry(false, 9), []);
  const membranes = useMemo(() => {
    const geos = [...membraneCurves(-1), ...membraneCurves(1)].map((c) => new TubeGeometry(c, 160, 0.075, 8, false));
    return geos;
  }, []);
  const preCurve = useMemo(() => membraneCurves(-1)[0], []);
  useEffect(
    () => () => {
      heroGeo.dispose();
      miniGeo.dispose();
      membranes.forEach((g) => g.dispose());
    },
    [heroGeo, miniGeo, membranes],
  );

  const plans = useMemo(() => particlePlans(), []);
  const restSlots = useMemo(() => {
    const r = seeded(7);
    return GEOMETRY.vesicles.slice(1).flatMap((v) =>
      Array.from({ length: STORED_PER_VESICLE }, () => {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * v.r * 0.62;
        return { x: v.x + Math.cos(a) * d, y: v.y + Math.sin(a) * d, spin: r() * 6.28, axis: new Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize() };
      }),
    );
  }, []);
  const spins = useMemo(() => {
    const r = seeded(11);
    return plans.map(() => ({ a: r() * 6.28, axis: new Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), w: 0.4 + r() }));
  }, [plans]);
  const campSlots = useMemo(() => {
    const r = seeded(23);
    return (["D1", "D2"] as const).flatMap((kind) =>
      Array.from({ length: CAMP_MAX }, () => ({ kind, x: lerp(2.0, 4.6, r()), y: (kind === "D1" ? 1 : -1) * lerp(1.2, 4.6, r()), z: lerp(-0.6, 0.6, r()), ph: r() * 6.28 })),
    );
  }, []);
  const ionSlots = useMemo(() => {
    const r = seeded(31);
    return Array.from({ length: 8 }, () => ({ y: GEOMETRY.pore.y + lerp(-1.6, 1.6, r()), x0: lerp(-0.4, 0.2, r()), x1: lerp(-2.0, -1.5, r()) }));
  }, []);

  const phaseRef = useRef(0);

  useLayoutEffect(() => {
    // Vesicles: a disc of lumen plus its membrane ring, both from one instanced sphere squashed in z.
    GEOMETRY.vesicles.forEach((v, i) => {
      vesicles.current!.setMatrixAt(i, tmp.m.compose(tmp.v.set(v.x, v.y, -0.2), tmp.q.identity(), tmp.s.set(v.r, v.r, v.r * 0.35)));
    });
    vesicles.current!.instanceMatrix.needsUpdate = true;
    // G proteins: three subunits beside each receptor (α, β, γ).
    GEOMETRY.receptors.forEach((rc, i) => {
      [0.24, 0.18, 0.12].forEach((r, k) => {
        const off = [
          [2.05, 0.05],
          [2.32, -0.18],
          [2.38, 0.18],
        ][k];
        gprot.current!.setMatrixAt(i * 3 + k, tmp.m.compose(tmp.v.set(off[0], rc.y + off[1], 0), tmp.q.identity(), tmp.s.set(r, r, r)));
        gprot.current!.setColorAt(i * 3 + k, new Color("#D9DDE6"));
      });
    });
    gprot.current!.instanceMatrix.needsUpdate = true;
    gprot.current!.instanceColor!.needsUpdate = true;
  }, []);

  useFrame((s, dt) => {
    const w = world.current;
    if (!w || !particles.current || !stored.current || !camp.current || !ions.current || !vesicles.current || !gprot.current || !heroRef.current || !pulse.current) return;
    const blocked = !!store.flags.datBlocked;
    const target = phaseOf(advance(store, dt, 4), store.marks, store.phases);
    phaseRef.current = damp(phaseRef.current, target, 6, dt);
    const phase = phaseRef.current;
    const t = s.clock.elapsedTime;

    // The synapse fades in as the hero molecule shrinks into its vesicle.
    const into = ease(clamp01(phase / 0.9));
    for (const mat of fade.current) {
      mat.opacity = lerp(0, mat.userData.base ?? 1, ease(clamp01((phase - 0.15) / 0.7)));
      mat.transparent = true;
      mat.depthWrite = mat.opacity > 0.98;
    }

    // Hero: the full model, rocking, then shrinking to particle size in its slot in the first vesicle.
    decayTurn(store, dt);
    const slot = plans[0].slot;
    const big = 1 - into;
    const tn = Math.tan((camera.fov * Math.PI) / 360);
    const halfW = camera.position.z * tn * (s.size.width / Math.max(1, s.size.height));
    const heroWorld = tmp.e.set(store.wide && !store.flags.centered ? halfW * 0.3 : 0, 0, 0);
    w.worldToLocal(heroWorld);
    const heroScale = lerp(PARTICLE_SCALE, (halfW * 2 * (store.wide ? 0.36 : 0.62)) / 9, big * big);
    heroRef.current.visible = phase < 1.02;
    heroRef.current.position.set(lerp(slot.x, heroWorld.x, big), lerp(slot.y, heroWorld.y, big), 0);
    heroRef.current.scale.setScalar(heroScale);
    heroRef.current.quaternion
      .setFromAxisAngle(Y, t * 0.25 + store.turn.yaw + store.held.yaw)
      .multiply(tmp.q.setFromAxisAngle(tmp.v.set(1, 0, 0), 0.3 + store.turn.pitch + store.held.pitch));
    const appear = ease(clamp01((phase - 0.2) / 0.7));

    // Released particles.
    plans.forEach((p, i) => {
      if (i === 0 && phase < 1.02) {
        particles.current!.setMatrixAt(i, tmp.m.compose(tmp.v.set(0, 0, -50), tmp.q.identity(), tmp.s.set(0, 0, 0)));
        return;
      }
      const { at, free } = particleAt(p, phase, blocked);
      const sp = spins[i];
      const jx = Math.sin(t * 1.7 * sp.w + sp.a) * 0.12 * (0.25 + free);
      const jy = Math.cos(t * 1.3 * sp.w + sp.a * 2) * 0.12 * (0.25 + free);
      tmp.q.setFromAxisAngle(sp.axis, sp.a + t * sp.w * (0.3 + free));
      particles.current!.setMatrixAt(i, tmp.m.compose(tmp.v.set(at.x + jx, at.y + jy, Math.sin(t + sp.a) * 0.3), tmp.q, tmp.s.setScalar(PARTICLE_SCALE * appear)));
    });
    particles.current.instanceMatrix.needsUpdate = true;

    // Molecules that stay packed in the other vesicles, turning slowly.
    restSlots.forEach((r, i) => {
      tmp.q.setFromAxisAngle(r.axis, r.spin + t * 0.35);
      stored.current!.setMatrixAt(i, tmp.m.compose(tmp.v.set(r.x + Math.sin(t * 0.9 + r.spin) * 0.06, r.y + Math.cos(t * 0.8 + r.spin) * 0.06, 0), tmp.q, tmp.s.setScalar(PARTICLE_SCALE * appear)));
    });
    stored.current.instanceMatrix.needsUpdate = true;

    // The releasing vesicle moves to the membrane, merges into it and is gone.
    const f = fusion(phase);
    const v0 = GEOMETRY.vesicles[0];
    const vx = lerp(v0.x, GEOMETRY.preMembraneX - v0.r * 0.55, Math.min(1, f * 1.4));
    const vr = v0.r * (1 - ease(clamp01((f - 0.55) / 0.45)));
    vesicles.current.setMatrixAt(0, tmp.m.compose(tmp.v.set(vx, v0.y, -0.2), tmp.q.identity(), tmp.s.set(vr, vr, vr * 0.35)));
    vesicles.current.instanceMatrix.needsUpdate = true;

    // Action potential running down the terminal membrane, then Ca²⁺ entering at the release site.
    const sk = spike(phase);
    const glow = Math.sin(Math.PI * clamp01(sk * 1.05));
    preCurve.getPointAt(lerp(0.02, 0.5, sk), tmp.e);
    pulse.current.position.copy(tmp.e);
    pulse.current.scale.setScalar(0.38 * glow + 0.001);
    const ca = ease(clamp01((phase - 1.35) / 0.5)) * (1 - ease(clamp01((phase - 2.4) / 0.5)));
    ionSlots.forEach((io, i) => {
      const k = ease(clamp01((phase - 1.35 - i * 0.03) / 0.6));
      const r = 0.11 * ca;
      ions.current!.setMatrixAt(i, tmp.m.compose(tmp.v.set(lerp(io.x0, io.x1, k), io.y, 0.3), tmp.q.identity(), tmp.s.set(r, r, r)));
    });
    ions.current.instanceMatrix.needsUpdate = true;

    // Receptors → G proteins → cAMP. D1 (Gs) raises cAMP; D2 (Gi) lowers it.
    const occ = occupancy(phase, blocked);
    GEOMETRY.receptors.forEach((rc, i) => {
      for (let k = 0; k < 3; k++) {
        tmp.c.set("#D9DDE6").lerp(new Color(rc.kind === "D1" ? D1 : D2), occ[i] * 0.85);
        gprot.current!.setColorAt(i * 3 + k, tmp.c);
      }
    });
    gprot.current.instanceColor!.needsUpdate = true;
    const counts = campCounts(phase, blocked);
    const seen = { D1: 0, D2: 0 };
    campSlots.forEach((c, i) => {
      const n = seen[c.kind]++;
      const shown = clamp01((c.kind === "D1" ? counts.D1 : counts.D2) - n);
      const vis = shown * ease(clamp01((phase - 2.6) / 0.6));
      const r = 0.12 * vis;
      camp.current!.setMatrixAt(i, tmp.m.compose(tmp.v.set(c.x + Math.sin(t * 0.7 + c.ph) * 0.1, c.y + Math.cos(t * 0.6 + c.ph) * 0.1, c.z), tmp.q.identity(), tmp.s.set(r, r, r)));
    });
    camp.current.instanceMatrix.needsUpdate = true;

    onPhase(phase, w);
  });

  const helix = (n: number, radius: number, len: number, color: string, at: [number, number], key: string) => (
    <group key={key} position={[at[0], at[1], 0]} rotation={[0, 0, Math.PI / 2]}>
      {Array.from({ length: n }, (_, k) => {
        const a = (k / n) * Math.PI * 2;
        return (
          <mesh key={k} position={[Math.cos(a) * radius, 0, Math.sin(a) * radius]}>
            <cylinderGeometry args={[0.075, 0.075, len, 10, 1]} />
            <meshStandardMaterial
              ref={(mat) => {
                if (mat) {
                  mat.userData.base = 1;
                  fade.current.add(mat);
                }
              }}
              color={color}
              roughness={0.55}
            />
          </mesh>
        );
      })}
    </group>
  );

  return (
    <group ref={world}>
      <mesh ref={heroRef} geometry={heroGeo}>
        <meshPhysicalMaterial vertexColors roughness={0.42} clearcoat={0.4} clearcoatRoughness={0.35} envMapIntensity={0.5} />
      </mesh>
      {membranes.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial
            ref={(mat) => {
              if (mat) {
                mat.userData.base = i % 2 ? 0.55 : 0.9;
                fade.current.add(mat);
              }
            }}
            color={i % 2 ? "#9AA3BA" : "#5B6785"}
            roughness={0.7}
          />
        </mesh>
      ))}
      <instancedMesh ref={vesicles} args={[undefined, undefined, GEOMETRY.vesicles.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 40, 24]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (mat) {
              mat.userData.base = 0.32;
              fade.current.add(mat);
            }
          }}
          color="#C9C2EA"
          roughness={0.9}
        />
      </instancedMesh>
      <instancedMesh ref={stored} args={[miniGeo, undefined, restSlots.length]} frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={particles} args={[miniGeo, undefined, RELEASED]} frustumCulled={false}>
        <meshStandardMaterial vertexColors roughness={0.5} />
      </instancedMesh>
      {GEOMETRY.receptors.map((rc, i) => helix(7, 0.2, 0.95, rc.kind === "D1" ? D1 : D2, [GEOMETRY.postMembraneX + 0.17, rc.y], `r${i}`))}
      {GEOMETRY.transporters.map((tr, i) => helix(12, 0.28, 0.9, "#1B2A5C", [GEOMETRY.preMembraneX - 0.17, tr.y], `t${i}`))}
      {GEOMETRY.cyclase.map((cy, i) => (
        <mesh key={`ac${i}`} position={[GEOMETRY.postMembraneX + 0.25, cy.y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.26, 0.7, 6, 14]} />
          <meshStandardMaterial
            ref={(mat) => {
              if (mat) {
                mat.userData.base = 1;
                fade.current.add(mat);
              }
            }}
            color="#B6AE9E"
            roughness={0.6}
          />
        </mesh>
      ))}
      <instancedMesh ref={gprot} args={[undefined, undefined, GEOMETRY.receptors.length * 3]} frustumCulled={false}>
        <sphereGeometry args={[1, 18, 14]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (mat) {
              mat.userData.base = 1;
              fade.current.add(mat);
            }
          }}
          roughness={0.6}
        />
      </instancedMesh>
      <instancedMesh ref={camp} args={[undefined, undefined, CAMP_MAX * 2]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#2B3A66" roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={ions} args={[undefined, undefined, 8]} frustumCulled={false}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color="#7FD3CF" emissive="#0E9F9A" emissiveIntensity={0.5} roughness={0.4} />
      </instancedMesh>
      <mesh ref={pulse}>
        <sphereGeometry args={[1, 20, 16]} />
        <meshBasicMaterial color="#9FE3DF" transparent opacity={0.85} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------------ camera and labels

/** Camera follows the action: the hero model up close, then the whole synapse, panning by beat. */
const FOCUS_X = [-1.2, -3.2, -1.8, 0, 1.4, -0.6, -0.8];

export const SYNAPSE_LABELS = [
  { key: "pre", text: "Presynaptic terminal", at: [-5.6, -4.6], show: (p: number) => band(p, 0.7, 3.2) },
  { key: "cleft", text: "Synaptic cleft", at: [0, 5.3], show: (p: number) => band(p, 2.4, 3.8) },
  { key: "post", text: "Postsynaptic neuron", at: [5.0, 0], show: (p: number) => band(p, 2.6, 4.6) },
  { key: "d1", text: "D1 · Gs · cAMP ↑", at: [3.6, 2.4], show: (p: number) => band(p, 3.4, 4.7), tone: "d1" },
  { key: "d2", text: "D2 · Gi · cAMP ↓", at: [3.6, -2.4], show: (p: number) => band(p, 3.4, 4.7), tone: "d2" },
  { key: "dat", text: "DAT", at: [-2.3, 3.6], show: (p: number) => band(p, 4.3, 5.8), tone: "dat" },
  { key: "dat2", text: "DAT", at: [-2.3, -3.7], show: (p: number) => band(p, 4.3, 5.8), tone: "dat" },
] as const;

function band(p: number, a: number, b: number) {
  return clamp01((p - a) / 0.3) * (1 - clamp01((p - b) / 0.3));
}

const labelNodes: (HTMLDivElement | null)[] = [];

function Rig({ store }: { store: StoryStore }) {
  const camera = useThree((s) => s.camera as PerspectiveCamera);
  const size = useThree((s) => s.size);
  return (
    <Synapse
      store={store}
      onPhase={(phase, w) => {
        const wide = store.wide;
        // Wide screens: across, left to right. Phones: rotated so the presynaptic side is on top.
        w.rotation.set(0, 0, wide ? 0 : -Math.PI / 2);
        const aspect = size.width / Math.max(1, size.height);
        const tn = Math.tan((camera.fov * Math.PI) / 360);
        const sceneW = wide ? 13 : 11.5;
        const sceneH = wide ? 12 : 13;
        const centered = !!store.flags.centered;
        const fillW = wide ? (centered ? 0.94 : 0.6) : 0.95;
        const fillH = wide ? (centered ? 0.9 : 0.82) : 0.9;
        const zFit = Math.max(sceneW / (fillW * 2 * tn * aspect), sceneH / (fillH * 2 * tn));
        const z = zFit;
        const i = Math.min(FOCUS_X.length - 2, Math.floor(phase));
        const fx = lerp(FOCUS_X[i], FOCUS_X[i + 1], ease(phase - i)) * 0.55;
        camera.position.setZ(z);
        // Keep the subject right of the caption column on desktop.
        const halfW = z * tn * aspect;
        const shift = wide && !centered ? halfW * 0.28 : 0;
        if (wide) w.position.set(shift - fx, 0, 0);
        else w.position.set(0, fx, 0);
        camera.lookAt(0, 0, 0);

        SYNAPSE_LABELS.forEach((l, k) => {
          const el = labelNodes[k];
          if (!el) return;
          const o = l.show(phase) >= 0.5 ? 1 : 0;
          el.style.opacity = String(o);
          if (o <= 0) return;
          tmp.e.set(l.at[0], l.at[1], 0);
          w.localToWorld(tmp.e).project(camera);
          const x = (tmp.e.x * 0.5 + 0.5) * size.width;
          const y = (-tmp.e.y * 0.5 + 0.5) * size.height;
          const hw = (el.offsetWidth || 100) / 2 + 6;
          el.style.transform = `translate(${Math.min(size.width - hw, Math.max(hw, x)).toFixed(1)}px, ${Math.min(size.height - 18, Math.max(18, y)).toFixed(1)}px) translate(-50%, -50%)`;
        });
      }}
    />
  );
}

function LabelLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {SYNAPSE_LABELS.map((l, i) => (
        <div
          key={l.key}
          ref={(el) => {
            labelNodes[i] = el;
          }}
          style={{ opacity: 0 }}
          className={`absolute left-0 top-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-semibold shadow-sm ${
            "tone" in l && l.tone === "d1"
              ? "bg-[#6A4FD6] text-white"
              : "tone" in l && l.tone === "d2"
                ? "bg-[#0B7F7B] text-white"
                : "tone" in l && l.tone === "dat"
                  ? "bg-hema text-white"
                  : "border border-[color:var(--exp-rule)] bg-[#FFFDF8] text-hema"
          }`}
        >
          {l.text}
        </div>
      ))}
    </div>
  );
}

export default function SynapseScene({ store, lowPower, running, onReady }: SceneProps) {
  const onCreated = useRenderLoop(running, "synapse", onReady);
  return (
    <>
      <Canvas
        dpr={[1, lowPower ? 1.25 : 1.6]}
        frameloop={running ? "demand" : "never"}
        resize={{ scroll: false }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: 30, position: [0, 0, 24], near: 0.1, far: 300 }}
        onCreated={onCreated}
      >
        <hemisphereLight args={["#fffdf8", "#e3dccd", 1.25]} />
        <directionalLight position={[-6, 9, 10]} intensity={2.1} color="#fff8ec" />
        <directionalLight position={[7, -2, 6]} intensity={0.6} color="#e6ecfa" />
        <Rig store={store} />
        <AdaptiveDpr max={lowPower ? 1.25 : 1.6} />
      </Canvas>
      <LabelLayer />
    </>
  );
}

