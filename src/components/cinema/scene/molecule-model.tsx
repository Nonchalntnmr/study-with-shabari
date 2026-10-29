"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, type Group, type InstancedMesh, Matrix4, Quaternion, Vector3 } from "three";
import { MOLECULES, roles } from "@/lib/molecules/analyze";
import { MODEL_LABELS, labelNodes } from "./labels";
import { type Chapter, chapterWeights, narrative } from "./narrative-store";
import { ATOMS, NEW_OH_VIEW, POS, RADIUS, REST, RING_VIEW, ROCK, type Shot, bounds, fitDistance, offsetFor } from "./poses";

const dopamine = MOLECULES.dopamine;
const COLOR: Record<string, string> = { C: "#2E2560", O: "#D9577E", N: "#1E7F7C", H: "#FBFCFC" };
const DIM = new Color("#C8CDD3");
const BOND = new Color("#B7BDC7");
const BOND_STRONG = new Color("#5B5487");
const Y = new Vector3(0, 1, 0);
const X = new Vector3(1, 0, 0);
export const FOV = { wide: 30, narrow: 34 };

type Piece = { a: number; b: number; offset: Vector3; radius: number; ring: boolean };
type Framing = { z: number; x: number; y: number; bottom: number; width: number };

/** Where a pose sits on screen: centred in the clear space right of the text column, with margin. */
function shotFor(textRight: number, wide: boolean): Shot {
  if (!wide) return { u: 0.5, v: 0.5, fillW: 0.84, fillH: 0.78 };
  const start = Math.min(0.7, textRight + 0.04);
  const end = 0.965;
  return { u: (start + end) / 2, v: 0.5, fillW: end - start, fillH: 0.6 };
}

function frame(q: Quaternion, shot: Shot, fov: number, aspect: number): Framing {
  const b = bounds(q);
  const z = fitDistance(b, shot, fov, aspect);
  const o = offsetFor(b, shot, z, fov, aspect);
  return { z, x: o.x, y: o.y, bottom: o.y + b.cy - b.height / 2, width: b.width };
}

/** Ball-and-stick dopamine from PubChem CID 681. 1 scene unit = 1 ångström. */
export function MoleculeModel({ layout }: { layout: "wide" | "narrow" }) {
  const r = useMemo(() => roles(dopamine), []);
  const ring = useMemo(() => new Set(r.ring), [r]);
  const ringNormal = useMemo(() => {
    const [p0, p1, p2] = r.ring.slice(0, 3).map((i) => POS[i]);
    return new Vector3().subVectors(p1, p0).cross(new Vector3().subVectors(p2, p0)).normalize();
  }, [r]);

  const pieces = useMemo<Piece[]>(() => {
    const out: Piece[] = [];
    for (const [a, b, order] of dopamine.bonds3d) {
      const isRing = ring.has(a) && ring.has(b);
      if (order === 2) {
        const dir = new Vector3().subVectors(POS[b], POS[a]).normalize();
        const side = new Vector3().crossVectors(dir, ringNormal).normalize().multiplyScalar(0.11);
        out.push({ a, b, offset: side.clone(), radius: 0.062, ring: isRing }, { a, b, offset: side.clone().negate(), radius: 0.062, ring: isRing });
      } else out.push({ a, b, offset: new Vector3(), radius: 0.09, ring: isRing });
    }
    return out;
  }, [ring, ringNormal]);

  const atomMesh = useRef<InstancedMesh>(null);
  const bondMesh = useRef<InstancedMesh>(null);
  const group = useRef<Group>(null);

  useLayoutEffect(() => {
    const m = new Matrix4();
    const q = new Quaternion();
    ATOMS.forEach((a, i) => {
      const s = RADIUS[a.el] ?? 0.3;
      atomMesh.current!.setMatrixAt(i, m.compose(POS[i], q.identity(), new Vector3(s, s, s)));
      atomMesh.current!.setColorAt(i, new Color(COLOR[a.el] ?? "#999"));
    });
    pieces.forEach((p, i) => {
      const A = POS[p.a].clone().add(p.offset);
      const B = POS[p.b].clone().add(p.offset);
      const dir = new Vector3().subVectors(B, A);
      const len = dir.length();
      q.setFromUnitVectors(Y, dir.normalize());
      bondMesh.current!.setMatrixAt(i, m.compose(A.add(B).multiplyScalar(0.5), q, new Vector3(p.radius, len, p.radius)));
      bondMesh.current!.setColorAt(i, BOND);
    });
    atomMesh.current!.instanceMatrix.needsUpdate = true;
    bondMesh.current!.instanceMatrix.needsUpdate = true;
  }, [pieces]);

  const tmp = useMemo(
    () => ({ q: new Quaternion(), qa: new Quaternion(), qb: new Quaternion(), rock: new Quaternion(), e: new Vector3(), target: new Vector3(), vta: new Vector3(), ray: new Vector3(), c: new Color(), base: ATOMS.map((a) => new Color(COLOR[a.el] ?? "#999")) }),
    [],
  );
  const emphasis = useMemo(() => {
    const a = new Set([...r.ring, ...r.amine]);
    const b = new Set(r.addedByTyrosineHydroxylase);
    return { a: (i: number) => a.has(i), b: (i: number) => b.has(i) };
  }, [r]);

  useFrame((s, dt) => {
    const g = group.current;
    if (!g || !atomMesh.current || !bondMesh.current) return;
    const wide = layout === "wide";
    const w: Record<Chapter, number> = narrative.linked ? chapterWeights(narrative.smoothed, narrative.marks) : { hero: 1, a: 0, b: 0, c: 0 };
    const t = s.clock.elapsedTime;
    if (!narrative.drag.active) {
      const decay = Math.exp(-dt * 3.5);
      narrative.drag.yaw *= decay;
      narrative.drag.pitch *= decay;
    }

    // Orientation: the computed rest pose with a gentle rock in the hero, chapter poses after.
    const still = narrative.reducedMotion;
    tmp.rock
      .setFromAxisAngle(Y, still ? 0 : Math.sin(t * 0.32) * ROCK.yaw)
      .multiply(new Quaternion().setFromAxisAngle(X, still ? 0 : Math.sin(t * 0.21 + 1) * ROCK.pitch));
    tmp.qa.copy(tmp.rock).multiply(REST.q);
    tmp.qb.copy(RING_VIEW.q).slerp(NEW_OH_VIEW.q, w.b / Math.max(1e-4, w.a + w.b));
    tmp.q.copy(tmp.qa).slerp(tmp.qb, Math.min(1, w.a + w.b + w.c));
    tmp.q.premultiply(new Quaternion().setFromAxisAngle(Y, narrative.drag.yaw)).premultiply(new Quaternion().setFromAxisAngle(X, narrative.drag.pitch));
    g.quaternion.slerp(tmp.q, 1 - Math.exp(-dt * 6));

    // Framing: fitted per scene from the canvas aspect and the measured text column.
    const fov = wide ? FOV.wide : FOV.narrow;
    const aspect = s.size.width / Math.max(1, s.size.height);
    const tr = narrative.textRight;
    const fh = frame(REST.q, shotFor(tr.hero, wide), fov, aspect);
    const fa = frame(RING_VIEW.q, shotFor(tr.a, wide), fov, aspect);
    const fb = frame(NEW_OH_VIEW.q, shotFor(tr.b, wide), fov, aspect);
    const sum = Math.max(1e-4, w.hero + w.a + w.b);
    const mix = (k: keyof Framing) => (fh[k] * w.hero + fa[k] * w.a + fb[k] * w.b) / sum;
    narrative.cameraZ = mix("z");
    tmp.target.set(mix("x"), mix("y"), 0);
    if (w.c > 0) {
      // recede into the VTA dot of the pathway figure
      tmp.ray.set(narrative.vta.x, narrative.vta.y, 0.5).unproject(s.camera).sub(s.camera.position).normalize();
      tmp.vta.copy(s.camera.position).addScaledVector(tmp.ray, -s.camera.position.z / tmp.ray.z);
      tmp.target.lerp(tmp.vta, w.c);
    }
    g.position.lerp(tmp.target, 1 - Math.exp(-dt * 5));
    // Shrinks all the way into the VTA dot, then is hidden.
    const scale = 1 - w.c;
    g.scale.setScalar(g.scale.x + (scale - g.scale.x) * (1 - Math.exp(-dt * 5)));
    g.visible = g.scale.x > 0.03;
    narrative.model.x = g.position.x;
    narrative.model.y = g.position.y;
    narrative.model.bottom = (mix("bottom") - mix("y")) * g.scale.x + g.position.y;
    narrative.model.width = mix("width") * g.scale.x;

    // Emphasis: chapter A lights the ring and amine, B the new hydroxyl; the rest fades toward grey.
    for (let i = 0; i < ATOMS.length; i++) {
      const strength = w.a * (emphasis.a(i) ? 0 : 1) + w.b * (emphasis.b(i) ? 0 : 1);
      tmp.c.copy(tmp.base[i]).lerp(DIM, Math.min(0.72, strength * 0.72));
      atomMesh.current.setColorAt(i, tmp.c);
    }
    atomMesh.current.instanceColor!.needsUpdate = true;
    pieces.forEach((pc, i) => {
      tmp.c.copy(BOND).lerp(BOND_STRONG, pc.ring ? w.a * 0.85 : 0);
      bondMesh.current!.setColorAt(i, tmp.c);
    });
    bondMesh.current.instanceColor!.needsUpdate = true;

    // Labels: project each anchor (an atom, or a bond midpoint) to the screen.
    MODEL_LABELS.forEach((l, i) => {
      const el = labelNodes[i];
      if (!el) return;
      tmp.e.set(0, 0, 0);
      for (const a of l.atoms) tmp.e.add(POS[a]);
      tmp.e.divideScalar(l.atoms.length);
      g.localToWorld(tmp.e).project(s.camera);
      const x = (tmp.e.x * 0.5 + 0.5) * s.size.width;
      const y = (-tmp.e.y * 0.5 + 0.5) * s.size.height - l.lift;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      el.style.opacity = String(Math.max(0, ((l.chapter === "a" ? w.a : w.b) - 0.35) / 0.65));
    });
  });

  return (
    <group ref={group}>
      <instancedMesh ref={atomMesh} args={[undefined, undefined, ATOMS.length]}>
        <sphereGeometry args={[1, 40, 40]} />
        <meshPhysicalMaterial roughness={0.5} metalness={0} clearcoat={0.25} clearcoatRoughness={0.45} envMapIntensity={0.4} sheen={0.25} sheenRoughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={bondMesh} args={[undefined, undefined, pieces.length]}>
        <cylinderGeometry args={[1, 1, 1, 18, 1]} />
        <meshPhysicalMaterial roughness={0.55} metalness={0} clearcoat={0.15} envMapIntensity={0.35} />
      </instancedMesh>
    </group>
  );
}
