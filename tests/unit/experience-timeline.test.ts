import { describe, expect, it } from "vitest";
import { experienceAllowed } from "@/lib/experience/gate";
import { activeBeat, beatWeights, ease, evenMarks, seeded, span } from "@/lib/experience/timeline";

describe("beat weights", () => {
  const marks = [0, 0.25, 0.5, 0.75, 1];

  it("always sum to 1 and stay within 0..1", () => {
    for (let p = -0.2; p <= 1.2; p += 0.01) {
      const w = beatWeights(p, marks);
      expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 12);
      for (const x of w) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
      }
    }
  });

  it("are exactly one beat on its mark, and an even cross-fade at the midpoint", () => {
    marks.forEach((m, i) => expect(beatWeights(m, marks)[i]).toBe(1));
    const mid = beatWeights(0.375, marks);
    expect(mid[1]).toBeCloseTo(0.5, 12);
    expect(mid[2]).toBeCloseTo(0.5, 12);
  });

  it("hold the first beat before its mark and the last after", () => {
    expect(beatWeights(-1, [0.2, 0.8])).toEqual([1, 0]);
    expect(beatWeights(2, [0.2, 0.8])).toEqual([0, 1]);
  });

  it("change continuously (no jumps larger than the step allows)", () => {
    let prev = beatWeights(0, marks);
    for (let p = 0.001; p <= 1; p += 0.001) {
      const w = beatWeights(p, marks);
      for (let i = 0; i < w.length; i++) expect(Math.abs(w[i] - prev[i])).toBeLessThan(0.01);
      prev = w;
    }
  });

  it("pick the active beat by the largest weight, advancing at the midpoint", () => {
    expect(activeBeat(0.1, marks)).toBe(0);
    expect(activeBeat(0.125, marks)).toBe(1);
    expect(activeBeat(0.9, marks)).toBe(4);
  });
});

describe("timing helpers", () => {
  it("evenMarks spaces beats from start to end", () => {
    expect(evenMarks(5)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(evenMarks(3, 0.1, 0.9)).toEqual([0.1, 0.5, 0.9]);
    expect(evenMarks(1, 0.3)).toEqual([0.3]);
  });

  it("ease and span are clamped, monotonic and flat at the ends", () => {
    expect(ease(-1)).toBe(0);
    expect(ease(2)).toBe(1);
    expect(ease(0.5)).toBe(0.5);
    expect(span(0.5, 0.2, 0.8)).toBeCloseTo(0.5, 12);
    expect(ease(0.001)).toBeLessThan(0.0001);
    let last = -1;
    for (let x = 0; x <= 1; x += 0.01) {
      expect(ease(x)).toBeGreaterThanOrEqual(last);
      last = ease(x);
    }
  });

  it("seeded random numbers are deterministic and in [0, 1)", () => {
    const a = seeded(7);
    const b = seeded(7);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe("the /experience gate", () => {
  it("is open locally, in tests and on preview deployments", () => {
    expect(experienceAllowed({})).toBe(true);
    expect(experienceAllowed({ NODE_ENV: "production" })).toBe(true);
    expect(experienceAllowed({ VERCEL_ENV: "preview" })).toBe(true);
    expect(experienceAllowed({ VERCEL_ENV: "development" })).toBe(true);
  });

  it("is closed on the production deployment unless it opts in with EXPERIENCE_PREVIEW=on", () => {
    expect(experienceAllowed({ VERCEL_ENV: "production" })).toBe(false);
    expect(experienceAllowed({ VERCEL_ENV: "production", EXPERIENCE_PREVIEW: "1" })).toBe(false);
    expect(experienceAllowed({ VERCEL_ENV: "production", EXPERIENCE_PREVIEW: "true" })).toBe(false);
    expect(experienceAllowed({ VERCEL_ENV: "production", LESSON_PREVIEW: "on" })).toBe(false);
    expect(experienceAllowed({ VERCEL_ENV: "production", EXPERIENCE_PREVIEW: "on" })).toBe(true);
  });
});
