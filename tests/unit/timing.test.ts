import { describe, expect, it } from "vitest";
import { WRITE_GRACE_MS, acceptsWrites, clampTimeSpent, computeDeadline, formatClock, isExpired, remainingMs } from "@/lib/exam/timing";

const start = new Date("2026-01-01T10:00:00Z");

describe("timing", () => {
  it("only timed attempts get a deadline", () => {
    expect(computeDeadline("TIMED", start, 780)?.toISOString()).toBe("2026-01-01T10:13:00.000Z");
    expect(computeDeadline("UNTIMED", start, 780)).toBeNull();
  });

  it("expires after the deadline but accepts writes during the grace window", () => {
    const a = { mode: "TIMED" as const, startedAt: start, deadlineAt: new Date(start.getTime() + 60_000) };
    const deadline = a.deadlineAt.getTime();
    expect(isExpired(a, deadline)).toBe(false);
    expect(isExpired(a, deadline + 1)).toBe(true);
    expect(acceptsWrites(a, deadline + WRITE_GRACE_MS)).toBe(true);
    expect(acceptsWrites(a, deadline + WRITE_GRACE_MS + 1)).toBe(false);
    expect(remainingMs(a, deadline - 1500)).toBe(1500);
    expect(remainingMs(a, deadline + 10)).toBe(0);
  });

  it("untimed attempts never expire", () => {
    const a = { mode: "UNTIMED" as const, startedAt: start, deadlineAt: null };
    expect(isExpired(a, Date.parse("2030-01-01"))).toBe(false);
    expect(acceptsWrites(a, Date.parse("2030-01-01"))).toBe(true);
    expect(remainingMs(a, 0)).toBeNull();
  });

  it("clamps reported time: monotonic, non-negative, bounded by elapsed time", () => {
    const now = start.getTime() + 30_000;
    expect(clampTimeSpent(10_000, 0, start, now)).toBe(10_000);
    expect(clampTimeSpent(5_000, 8_000, start, now)).toBe(8_000);
    expect(clampTimeSpent(999_999, 0, start, now)).toBe(30_000);
    expect(clampTimeSpent(-5, 0, start, now)).toBe(0);
  });

  it("formats the clock", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(59_001)).toBe("1:00");
    expect(formatClock(13 * 60_000)).toBe("13:00");
    expect(formatClock(3_725_000)).toBe("1:02:05");
  });
});
