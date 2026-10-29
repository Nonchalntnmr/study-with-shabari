import { Quaternion, Vector3 } from "three";
import { MOLECULES, centered, roles } from "@/lib/molecules/analyze";

// Orientation and framing for the dopamine model, computed rather than eyeballed:
// a rest pose where no atom hides another, and camera distances that fit the
// molecule inside a given share of the viewport at any aspect ratio.

const dopamine = MOLECULES.dopamine;
export const ATOMS = centered(dopamine);
export const POS = ATOMS.map((a) => new Vector3(a.x, a.y, a.z));
export const RADIUS: Record<string, number> = { C: 0.36, O: 0.38, N: 0.38, H: 0.23 };
const R = roles(dopamine);

const bonded = new Set(dopamine.bonds3d.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));
const yAxis = new Vector3(0, 1, 0);
const xAxis = new Vector3(1, 0, 0);

/** Ring face-on to the camera (+z), side chain pointing right. */
export const FACE_ON = (() => {
  const [p0, p1, p2] = R.ring.slice(0, 3).map((i) => POS[i]);
  const normal = new Vector3().subVectors(p1, p0).cross(new Vector3().subVectors(p2, p0)).normalize();
  const ringCenter = R.ring.reduce((s, i) => s.add(POS[i]), new Vector3()).divideScalar(6);
  const face = new Quaternion().setFromUnitVectors(normal, new Vector3(0, 0, 1));
  const side = new Vector3().subVectors(POS[R.amine[0]], ringCenter).applyQuaternion(face).setZ(0).normalize();
  return new Quaternion().setFromUnitVectors(side, new Vector3(1, 0.1, 0).normalize()).multiply(face);
})();

export function turn(base: Quaternion, yaw: number, pitch: number): Quaternion {
  return new Quaternion().setFromAxisAngle(yAxis, yaw).multiply(new Quaternion().setFromAxisAngle(xAxis, pitch)).multiply(base);
}

/**
 * Smallest on-screen gap between two atoms that aren't bonded to each other, in
 * ångströms (orthographic approximation). Negative means one atom covers another.
 */
export function clearance(q: Quaternion): number {
  const p = POS.map((v) => v.clone().applyQuaternion(q));
  let min = Infinity;
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 1; j < p.length; j++) {
      if (bonded.has(`${i}-${j}`)) continue;
      const gap = Math.hypot(p[i].x - p[j].x, p[i].y - p[j].y) - (RADIUS[ATOMS[i].el] + RADIUS[ATOMS[j].el]);
      if (gap < min) min = gap;
    }
  }
  return min;
}

export const ROCK = { yaw: 0.16, pitch: 0.06 };

export type Pose = { yaw: number; pitch: number; score: number; q: Quaternion };

/**
 * Search yaw and pitch (relative to face-on) for the largest clearance, scored
 * across the given wobble so the pose stays clean while it moves.
 */
function search(yaws: [number, number], pitches: [number, number], keep: (yaw: number, pitch: number) => boolean, wobble = { yaw: 0, pitch: 0 }): Pose {
  let best = { yaw: 0, pitch: 0, score: -Infinity };
  for (let yaw = yaws[0]; yaw <= yaws[1] + 1e-9; yaw += 0.025) {
    for (let pitch = pitches[0]; pitch <= pitches[1] + 1e-9; pitch += 0.025) {
      if (!keep(yaw, pitch)) continue;
      let score = Infinity;
      for (const dy of [-wobble.yaw, 0, wobble.yaw]) for (const dp of [-wobble.pitch, 0, wobble.pitch]) score = Math.min(score, clearance(turn(FACE_ON, yaw + dy, pitch + dp)));
      if (score > best.score) best = { yaw, pitch, score };
    }
  }
  return { ...best, q: turn(FACE_ON, best.yaw, best.pitch) };
}

/** Hero: a three-quarter view with real depth, clean across the rocking motion. */
export const REST = search([-1, 1], [-0.75, 0.75], (y, p) => Math.abs(y) >= 0.35 || Math.abs(p) >= 0.3, ROCK);

/** Chapter A: the ring close to face-on (within ~25°) so its hexagon and bond lengths read. */
export const RING_VIEW = search([-0.45, 0.45], [-0.45, 0.45], (y, p) => Math.hypot(y, p) <= 0.45);

/** Chapter B: turned toward the hydroxyl that tyrosine hydroxylase adds. */
export const NEW_OH_VIEW = search([-0.95, -0.2], [0.05, 0.7], () => true);

export type Bounds = { width: number; height: number; cx: number; cy: number };

/** Projected bounding box of the model (atoms with radii) for an orientation. */
export function bounds(q: Quaternion): Bounds {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  POS.forEach((v, i) => {
    const p = v.clone().applyQuaternion(q);
    const r = RADIUS[ATOMS[i].el];
    x0 = Math.min(x0, p.x - r);
    x1 = Math.max(x1, p.x + r);
    y0 = Math.min(y0, p.y - r);
    y1 = Math.max(y1, p.y + r);
  });
  return { width: x1 - x0, height: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

/** A framing: where the model's box centre sits (fractions of the canvas) and how much of it the model may fill. */
export type Shot = { u: number; v: number; fillW: number; fillH: number };

/**
 * Camera distance so a box of the given size fills at most fillW × fillH of the
 * canvas, plus a margin for perspective (the near side of the model looks larger).
 */
export function fitDistance(b: Bounds, shot: Shot, fovDeg: number, aspect: number, margin = 1.16): number {
  const t = Math.tan((fovDeg * Math.PI) / 360);
  return Math.max((b.width * margin) / (shot.fillW * 2 * t * aspect), (b.height * margin) / (shot.fillH * 2 * t));
}

/** World offset (at the model's depth) that puts the box centre at canvas fraction (u, v). */
export function offsetFor(b: Bounds, shot: Shot, distance: number, fovDeg: number, aspect: number) {
  const halfH = distance * Math.tan((fovDeg * Math.PI) / 360);
  const halfW = halfH * aspect;
  return { x: (shot.u * 2 - 1) * halfW - b.cx, y: (1 - shot.v * 2) * halfH - b.cy };
}
