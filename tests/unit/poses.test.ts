import { describe, expect, it } from "vitest";
import { NEW_OH_VIEW, REST, RING_VIEW, bounds, fitDistance, heroScore, offsetFor } from "@/components/cinema/scene/poses";

describe("model poses", () => {
  it("no atom overlaps any other on screen, bonded or not, in the hero framings (1920 to 390 wide) across the rock", () => {
    expect(heroScore(REST.yaw, REST.pitch)).toBeGreaterThan(0.03);
  });

  it("the fixed rest pose is the best (or close to it) on a coarse search", () => {
    let best = -Infinity;
    for (let yaw = -1; yaw <= 1 + 1e-9; yaw += 0.05)
      for (let pitch = -0.75; pitch <= 0.75 + 1e-9; pitch += 0.05) if (Math.abs(yaw) >= 0.35 || Math.abs(pitch) >= 0.3) best = Math.max(best, heroScore(yaw, pitch));
    expect(heroScore(REST.yaw, REST.pitch)).toBeGreaterThanOrEqual(best - 1e-9);
  });

  it("the rest pose has real depth (it is not the flat face-on view)", () => {
    expect(Math.abs(REST.yaw) >= 0.35 || Math.abs(REST.pitch) >= 0.3).toBe(true);
  });

  it("chapter poses don't hide atoms either", () => {
    expect(RING_VIEW.score).toBeGreaterThan(0);
    expect(Math.hypot(RING_VIEW.yaw, RING_VIEW.pitch)).toBeLessThanOrEqual(0.45);
    expect(NEW_OH_VIEW.score).toBeGreaterThan(0);
  });

  it("fitted framing keeps the whole model inside its share of the canvas at 1440, 1024 and 390 wide", () => {
    const b = bounds(REST.q);
    for (const [w, h, shot] of [
      [1440, 900, { u: 0.74, v: 0.5, fillW: 0.4, fillH: 0.6 }],
      [1024, 768, { u: 0.74, v: 0.5, fillW: 0.4, fillH: 0.6 }],
      [390, 380, { u: 0.5, v: 0.5, fillW: 0.86, fillH: 0.8 }],
    ] as const) {
      const aspect = w / h;
      const z = fitDistance(b, shot, 30, aspect);
      const halfW = z * Math.tan((30 * Math.PI) / 360) * aspect;
      const o = offsetFor(b, shot, z, 30, aspect);
      const left = (o.x + b.cx - b.width / 2 + halfW) / (2 * halfW);
      const right = (o.x + b.cx + b.width / 2 + halfW) / (2 * halfW);
      expect(left, `${w}px`).toBeGreaterThan(shot.u - shot.fillW / 2 - 1e-6);
      expect(right, `${w}px`).toBeLessThan(shot.u + shot.fillW / 2 + 1e-6);
      expect(right, `${w}px`).toBeLessThan(0.98);
    }
  });
});
