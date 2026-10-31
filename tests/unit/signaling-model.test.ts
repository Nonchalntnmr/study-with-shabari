import { describe, expect, it } from "vitest";
import {
  NODES,
  PEAK,
  RECOVERED,
  REPOLARIZED,
  REST,
  THRESHOLD,
  TRAVEL_S,
  UNDERSHOOT,
  channelsAt,
  conductionAt,
  fluxAt,
  phaseAt,
  phaseMoments,
  refractoryBands,
  sampleTrace,
  simulate,
  spikes,
  voltageAt,
} from "@/lib/explore/action-potential";

describe("action potential model", () => {
  it("stays below threshold for a weak stimulus (< 15 mV) and fades back to rest", () => {
    const run = simulate(10, null);
    expect(run.stimuli[0].outcome).toBe("below-threshold");
    expect(spikes(run)).toEqual([]);
    expect(voltageAt(run, 0)).toBe(REST);
    expect(Math.max(...sampleTrace(run).map((p) => p.v))).toBeLessThan(THRESHOLD);
    expect(voltageAt(run, 13.5)).toBeCloseTo(REST, 1);
  });

  it("fires an all-or-none spike peaking at +35 mV and undershooting to -80 mV when >= 15 mV", () => {
    const a = simulate(16, null);
    const b = simulate(30, null);
    expect(a.stimuli[0].outcome).toBe("fired");
    expect(b.stimuli[0].outcome).toBe("fired");
    const peakA = Math.max(...sampleTrace(a, 0.01).map((p) => p.v));
    const peakB = Math.max(...sampleTrace(b, 0.01).map((p) => p.v));
    expect(peakA).toBeCloseTo(PEAK, 1);
    expect(peakB).toBeCloseTo(PEAK, 1);
    const minA = Math.min(...sampleTrace(a, 0.01).map((p) => p.v));
    expect(minA).toBeCloseTo(UNDERSHOOT, 1);
  });

  it("enforces absolute and relative refractory periods and temporal summation", () => {
    const abs = simulate(24, 1.5);
    expect(abs.stimuli[1]?.outcome).toBe("absolute-refractory");
    expect(spikes(abs)).toHaveLength(1);

    const relWeak = simulate(16, 4);
    expect(relWeak.stimuli[1]?.outcome).toBe("relative-too-weak");
    const relStrong = simulate(28, 4);
    expect(relStrong.stimuli[1]?.outcome).toBe("fired-relative");
    expect(spikes(relStrong)).toHaveLength(2);

    const rec = simulate(18, 8);
    expect(rec.stimuli[1]?.outcome).toBe("fired");
    expect(spikes(rec)).toHaveLength(2);

    const sum = simulate(14, 1.5);
    expect(sum.stimuli[0].outcome).toBe("below-threshold");
    expect(sum.stimuli[1]?.outcome).toBe("summed");
    expect(spikes(sum)).toHaveLength(1);
  });

  it("computes channel states, phases, flux, refractory bands and conduction", () => {
    const run = simulate(20, null);
    const m = phaseMoments(run)!;
    expect(m).not.toBeNull();
    expect(phaseAt(run, m.rest)).toBe("rest");
    expect(phaseAt(run, m.depolarization)).toBe("depolarization");
    expect(phaseAt(run, m.repolarization)).toBe("repolarization");
    expect(phaseAt(run, m.hyperpolarization)).toBe("hyperpolarization");

    expect(channelsAt(run, m.depolarization)).toEqual({ na: "open", k: "closed" });
    expect(channelsAt(run, m.repolarization)).toEqual({ na: "inactivated", k: "open" });
    expect(fluxAt(run, m.depolarization).na.length).toBeGreaterThan(0);
    expect(fluxAt(run, m.repolarization).k.length).toBeGreaterThan(0);

    const bands = refractoryBands(run);
    expect(bands).toHaveLength(2);
    expect(bands[0].to - bands[0].from).toBeCloseTo(REPOLARIZED, 4);
    expect(bands[1].to - bands[0].from).toBeCloseTo(RECOVERED, 4);

    expect(TRAVEL_S.myelinated).toBeLessThan(TRAVEL_S.unmyelinated);
    expect(conductionAt(TRAVEL_S.myelinated, true)).toEqual({ front: 1, node: NODES.length - 1, done: true });
    expect(conductionAt(TRAVEL_S.myelinated, false).done).toBe(false);
  });
});
