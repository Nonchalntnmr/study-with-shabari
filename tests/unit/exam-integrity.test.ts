import { describe, expect, it } from "vitest";
import { emptyBackup, isEmptyBackup, mergeBackup, parseBackup, pruneBackup, restorable } from "@/lib/exam/backup";
import { LATE_DELIVERY_MS, inLateDelivery, remainingFromAnchor, resolveChangedAt } from "@/lib/exam/timing";
import type { RunnerResponse } from "@/lib/exam/types";
import { changedFields, contentHash, type VersionSnapshot } from "@/lib/exam/versions";

const r = (selectedChoiceId: string | null, changedAt: number, timeSpentMs = 0): RunnerResponse => ({ selectedChoiceId, eliminatedChoiceIds: [], flagged: false, timeSpentMs, changedAt });

describe("on-device backup shared by tabs", () => {
  it("merges per question, newest change wins, time only grows", () => {
    let b = mergeBackup(emptyBackup(), { responses: { q1: r("a", 100, 5000) } });
    b = mergeBackup(b, { responses: { q1: r("b", 50, 9000), q2: r("c", 60) } });
    expect(b.responses.q1).toMatchObject({ selectedChoiceId: "a", timeSpentMs: 9000 });
    expect(b.responses.q2.selectedChoiceId).toBe("c");
  });

  it("a tab only prunes what it saved: another tab's newer change survives", () => {
    const b = mergeBackup(emptyBackup(), { responses: { q1: r("newer", 200), q2: r("x", 100) } });
    const pruned = pruneBackup(b, { responses: { q1: 150, q2: 100 } });
    expect(Object.keys(pruned.responses)).toEqual(["q1"]);
    expect(isEmptyBackup(pruneBackup(pruned, { responses: { q1: 200 } }))).toBe(true);
  });

  it("restores only answers at least as new as the server's", () => {
    const b = mergeBackup(emptyBackup(), { responses: { q1: r("old", 100), q2: r("new", 300), q3: r("only-here", 0) } });
    const out = restorable(b, { q1: r("server", 200), q2: r("server", 250) });
    expect(Object.keys(out).sort()).toEqual(["q2", "q3"]);
  });

  it("reads the old format and survives junk", () => {
    const v1 = JSON.stringify({ responses: { q1: { selectedChoiceId: "a", eliminatedChoiceIds: [], flagged: true, timeSpentMs: 3 } }, highlights: { p1: [{ p: 0, s: 0, e: 4 }] } });
    const b = parseBackup(v1);
    expect(b.responses.q1).toMatchObject({ selectedChoiceId: "a", flagged: true, changedAt: 0 });
    expect(b.highlights.p1).toEqual({ ranges: [{ p: 0, s: 0, e: 4 }], changedAt: 0 });
    expect(parseBackup("{not json")).toEqual(emptyBackup());
    expect(parseBackup(null)).toEqual(emptyBackup());
  });
});

describe("server-authoritative clock", () => {
  it("remaining time comes from the server anchor and monotonic time, not the device clock", () => {
    const anchor = { serverNow: 1_000_000, perfAt: 50 };
    expect(remainingFromAnchor(1_600_000, anchor, 50)).toBe(600_000);
    expect(remainingFromAnchor(1_600_000, anchor, 60_050)).toBe(540_000);
  });

  it("change times are bounded by the attempt start and their arrival", () => {
    expect(resolveChangedAt(undefined, 100, 500)).toBe(500);
    expect(resolveChangedAt(50, 100, 500)).toBe(100);
    expect(resolveChangedAt(10_000, 100, 500)).toBe(500);
    expect(resolveChangedAt(300.7, 100, 500)).toBe(300);
  });

  it("late delivery is a bounded window after the deadline", () => {
    const a = { mode: "TIMED" as const, startedAt: new Date(0), deadlineAt: new Date(1_000_000) };
    expect(inLateDelivery(a, 999_999)).toBe(false);
    expect(inLateDelivery(a, 1_000_001)).toBe(true);
    expect(inLateDelivery(a, 1_000_000 + LATE_DELIVERY_MS + 1)).toBe(false);
    expect(inLateDelivery({ ...a, deadlineAt: null }, 5_000_000)).toBe(false);
  });
});

describe("question versions", () => {
  const snap = (over: Partial<VersionSnapshot> = {}): VersionSnapshot => ({
    schema: 1,
    section: "CP",
    stem: "Stem",
    explanation: "Because.",
    difficulty: 2,
    figure: null,
    passage: null,
    choices: ["A", "B", "C", "D"].map((label, i) => ({ id: `c${i}`, label, text: `Choice ${label}`, isCorrect: i === 0, rationale: `Why ${label}`, misconception: null })),
    topics: [{ slug: "t", name: "T" }],
    ...over,
  });

  it("hashes equal content equally and different content differently", () => {
    expect(contentHash(snap())).toBe(contentHash(snap()));
    expect(contentHash(snap({ stem: "Other" }))).not.toBe(contentHash(snap()));
  });

  it("names what changed between versions, including the answer key", () => {
    const before = snap();
    const after = snap({ stem: "New stem", choices: before.choices.map((c) => ({ ...c, isCorrect: c.label === "B" })) });
    expect(changedFields(before, after)).toEqual(["Question stem", "Answer key (A → B)"]);
    expect(changedFields(null, before)).toEqual(["First version"]);
    expect(changedFields(before, snap())).toEqual(["No student-visible change"]);
  });
});
