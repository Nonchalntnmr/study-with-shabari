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

export const ROCK = { yaw: 0.12, pitch: 0.05 };

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

/**
 * Hero: a three-quarter view with real depth, clean across the rocking motion
 * when seen through the hero's actual off-axis perspective framings (heroScore).
 * That search takes seconds, too slow for page load, so the result is fixed
 * here and tests/unit/poses.test.ts re-checks it.
 */
const REST_YAW = -0.625;
const REST_PITCH = 0.25;
export const REST: Pose = { yaw: REST_YAW, pitch: REST_PITCH, score: NaN, q: turn(FACE_ON, REST_YAW, REST_PITCH) };

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

export const FOV = { wide: 30, narrow: 34 };

/** Where a pose sits on screen: centred in the clear space right of the text column, with margin. */
export function shotFor(textRight: number, wide: boolean): Shot {
  if (!wide) return { u: 0.5, v: 0.5, fillW: 0.84, fillH: 0.78 };
  const start = Math.min(0.7, textRight + 0.04);
  const end = 0.965;
  return { u: (start + end) / 2, v: 0.5, fillW: end - start, fillH: 0.6 };
}

/**
 * Like clearance(), but seen through a perspective camera at `eye` (relative to
 * the model's origin, in ångströms), and counting every pair, bonded or not. Off-axis
 * framing shifts near atoms against far ones, so a pose that is clean head-on
 * can still overlap in the hero.
 */
export function perspectiveClearance(q: Quaternion, eye: Vector3): number {
  const p = POS.map((v) => {
    const r = v.clone().applyQuaternion(q);
    const s = eye.z / (eye.z - r.z);
    return { x: eye.x + (r.x - eye.x) * s, y: eye.y + (r.y - eye.y) * s, s };
  });
  let min = Infinity;
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 1; j < p.length; j++) {
      // Bonded pairs count too: a bond pointing at the camera stacks one atom on the other.
      const gap = Math.hypot(p[i].x - p[j].x, p[i].y - p[j].y) - (RADIUS[ATOMS[i].el] * p[i].s + RADIUS[ATOMS[j].el] * p[j].s);
      if (gap < min) min = gap;
    }
  }
  return min;
}

/** Camera positions for the hero as the site frames it: desktop canvases beside the text column, and the phone stage. */
export function heroEyes(q: Quaternion): Vector3[] {
  const b = bounds(q);
  const views: [number, number, boolean][] = [
    [1920, 1080, true],
    [1440, 900, true],
    [1366, 768, true],
    [1280, 800, true],
    [1024, 768, true],
    [820, 1180, true],
    [390, 380, false],
  ];
  return views.map(([w, h, wide]) => {
    const fov = wide ? FOV.wide : FOV.narrow;
    const shot = shotFor(0.5, wide);
    const z = fitDistance(b, shot, fov, w / h);
    const o = offsetFor(b, shot, z, fov, w / h);
    return new Vector3(-o.x, -o.y, z);
  });
}

/** The hero pose's worst on-screen gap across the rocking motion and every hero framing. */
export function heroScore(yaw: number, pitch: number): number {
  let score = Infinity;
  for (const dy of [-ROCK.yaw, 0, ROCK.yaw]) {
    for (const dp of [-ROCK.pitch, 0, ROCK.pitch]) {
      const q = turn(FACE_ON, yaw + dy, pitch + dp);
      for (const eye of heroEyes(q)) score = Math.min(score, perspectiveClearance(q, eye));
    }
  }
  return score;
}

REST.score = heroScore(REST_YAW, REST_PITCH);
