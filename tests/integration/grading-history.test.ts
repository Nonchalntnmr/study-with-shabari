import { beforeEach, describe, expect, it } from "vitest";
import { getResults, loadRunnerState, startAttempt, submitAttempt, syncAttempt, type Viewer } from "@/lib/exam/service";
import { pinLegacyAttempts } from "@/lib/exam/versions";
import { db, resetData, seedSampleBank } from "../support/db";

// Amendment 4, item 8 (release blocker): editing a published question must never change a
// completed attempt's results, review or explanations.

const g1: Viewer = { userId: null, guestKeyHash: "g1", isAdmin: false };

async function sampleSet() {
  const e = await db.exam.findUniqueOrThrow({
    where: { slug: "cp-sample-set-1" },
    include: { items: { orderBy: { position: "asc" }, include: { question: { include: { choices: { orderBy: { label: "asc" } } } } } } },
  });
  return e.items.map((i) => i.question);
}

const answer = (questionId: string, selectedChoiceId: string) => ({ questionId, selectedChoiceId, eliminatedChoiceIds: [], flagged: false, timeSpentMs: 1000 });

/** Everything a student sees on the results page, minus the "this question has since been revised" note. */
async function review(attemptId: string) {
  const out = await getResults(attemptId, g1);
  if (out.kind !== "ok") throw new Error(out.kind);
  const { items, ...rest } = out.results;
  const strip = (i: (typeof items)[number]) => Object.fromEntries(Object.entries(i).filter(([k]) => k !== "revised"));
  return { ...rest, items: items.map(strip), revised: items.map((i) => i.revised) };
}

/** What an admin can do to a published question: move the key, rewrite the stem, a choice, its rationale and the explanation. */
async function editEverything(q: Awaited<ReturnType<typeof sampleSet>>[number]) {
  const oldKey = q.choices.find((c) => c.isCorrect)!;
  const newKey = q.choices.find((c) => !c.isCorrect)!;
  await db.choice.update({ where: { id: oldKey.id }, data: { isCorrect: false, text: "EDITED OLD KEY", rationale: "EDITED RATIONALE" } });
  await db.choice.update({ where: { id: newKey.id }, data: { isCorrect: true, text: "EDITED NEW KEY" } });
  await db.question.update({ where: { id: q.id }, data: { stem: "EDITED STEM", explanation: "EDITED EXPLANATION" } });
}

describe("historical grading integrity", () => {
  beforeEach(async () => {
    await resetData();
    await seedSampleBank("PUBLISHED");
  });

  it("after submission, edits to the answer key, text and explanation leave results and review unchanged", async () => {
    const qs = await sampleSet();
    const { id } = await startAttempt({ examSlug: "cp-sample-set-1", mode: "UNTIMED" }, { userId: null, guestKeyHash: "g1" });
    const right = qs[0].choices.find((c) => c.isCorrect)!;
    const wrong = qs[1].choices.find((c) => !c.isCorrect)!;
    await syncAttempt(id, g1, { responses: [answer(qs[0].id, right.id), answer(qs[1].id, wrong.id)], highlights: [] });
    await submitAttempt(id, g1);
    const before = await review(id);
    const scoreBefore = await db.attempt.findUniqueOrThrow({ where: { id }, select: { correctCount: true, totalCount: true } });

    await editEverything(qs[0]);
    await editEverything(qs[1]);

    const after = await review(id);
    expect({ ...after, revised: undefined }).toEqual({ ...before, revised: undefined });
    expect(JSON.stringify(after)).not.toContain("EDITED");
    expect(after.items[0]).toMatchObject({ isCorrect: true, selectedChoiceId: right.id });
    expect(after.items[1]).toMatchObject({ isCorrect: false, selectedChoiceId: wrong.id });
    expect(await db.attempt.findUniqueOrThrow({ where: { id }, select: { correctCount: true, totalCount: true } })).toEqual(scoreBefore);

    // Versions are captured when an attempt starts, so once someone takes the edited questions the old
    // review gains a "since revised" note. Nothing else about it changes.
    expect(after.revised.slice(0, 2)).toEqual([false, false]);
    await startAttempt({ examSlug: "cp-sample-set-1", mode: "UNTIMED" }, { userId: null, guestKeyHash: "g2" });
    const noted = await review(id);
    expect(noted.revised.slice(0, 2)).toEqual([true, true]);
    expect({ ...noted, revised: undefined }).toEqual({ ...before, revised: undefined });
  });

  it("in progress: the attempt keeps the version it started with and is graded by that key (documented behaviour)", async () => {
    const qs = await sampleSet();
    const { id } = await startAttempt({ examSlug: "cp-sample-set-1", mode: "UNTIMED" }, { userId: null, guestKeyHash: "g1" });
    const originalKey = qs[0].choices.find((c) => c.isCorrect)!;
    await editEverything(qs[0]);

    const runner = await loadRunnerState(id, g1);
    if (runner.kind !== "ok") throw new Error(runner.kind);
    expect(JSON.stringify(runner.state)).not.toContain("EDITED");

    await syncAttempt(id, g1, { responses: [answer(qs[0].id, originalKey.id)], highlights: [] });
    await submitAttempt(id, g1);
    const after = await review(id);
    expect(after.items[0]).toMatchObject({ isCorrect: true, stem: qs[0].stem });

    // A new attempt sees the edited question.
    const next = await startAttempt({ examSlug: "cp-sample-set-1", mode: "UNTIMED" }, { userId: null, guestKeyHash: "g1" });
    const fresh = await loadRunnerState(next.id, g1);
    if (fresh.kind !== "ok") throw new Error(fresh.kind);
    expect(fresh.state.questions[0].stem).toBe("EDITED STEM");
  });

  it("attempts from before versioning are pinned at deploy, and are then protected the same way", async () => {
    const qs = await sampleSet();
    const { id } = await startAttempt({ examSlug: "cp-sample-set-1", mode: "UNTIMED" }, { userId: null, guestKeyHash: "g1" });
    const right = qs[0].choices.find((c) => c.isCorrect)!;
    await syncAttempt(id, g1, { responses: [answer(qs[0].id, right.id)], highlights: [] });
    await submitAttempt(id, g1);
    // Simulate an attempt created before the versions table existed.
    await db.attempt.update({ where: { id }, data: { questionVersionIds: [] } });
    const before = await review(id);

    expect(await pinLegacyAttempts(db)).toEqual({ pinned: 1, skipped: 0 });
    expect(await pinLegacyAttempts(db)).toEqual({ pinned: 0, skipped: 0 });
    await editEverything(qs[0]);

    const after = await review(id);
    expect({ ...after, revised: undefined }).toEqual({ ...before, revised: undefined });
    expect(JSON.stringify(after)).not.toContain("EDITED");
  });
});
