import { beforeEach, describe, expect, it } from "vitest";
import { closeExpiredAttempts, getResults, loadRunnerState, startAttempt, startRetest, submitAttempt, syncAttempt, type Viewer } from "@/lib/exam/service";
import { inquiryPolicy, purgeInquiries } from "@/lib/privacy/retention";
import { db, resetData, seedSampleBank } from "../support/db";

// Data integrity and history guarantees of the exam engine: pinned question
// versions, newest-change-wins autosave, atomic submit, server-checked timeouts,
// late delivery, signed-out recovery, retests and retention.

const guest = (key: string): Viewer => ({ userId: null, guestKeyHash: key, isAdmin: false });
const g1 = guest("g1");

async function exam(slug = "cp-sample-set-1") {
  const e = await db.exam.findUniqueOrThrow({
    where: { slug },
    include: { items: { orderBy: { position: "asc" }, include: { question: { include: { choices: { orderBy: { label: "asc" } } } } } } },
  });
  const qs = e.items.map((i) => i.question);
  return {
    exam: e,
    qs,
    correct: (i: number) => qs[i].choices.find((c) => c.isCorrect)!.id,
    wrong: (i: number) => qs[i].choices.find((c) => !c.isCorrect)!.id,
  };
}

const answer = (questionId: string, selectedChoiceId: string | null, extra: { changedAt?: number; timeSpentMs?: number } = {}) => ({
  questionId,
  selectedChoiceId,
  eliminatedChoiceIds: [],
  flagged: false,
  timeSpentMs: extra.timeSpentMs ?? 0,
  ...(extra.changedAt !== undefined ? { changedAt: extra.changedAt } : {}),
});

const start = (slug: string, mode: "TIMED" | "UNTIMED" = "UNTIMED", owner: { userId: string | null; guestKeyHash: string | null } = { userId: null, guestKeyHash: "g1" }) =>
  startAttempt({ examSlug: slug, mode }, owner);

/** Make the attempt a minute old, so change times in the recent past are realistic (they can't predate the start). */
const ageAttempt = (id: string) => db.attempt.update({ where: { id }, data: { startedAt: new Date(Date.now() - 60_000) } });

describe("question versions", () => {
  beforeEach(async () => {
    await resetData();
    await seedSampleBank("PUBLISHED");
  });

  it("pins each attempt to the content it started with; edits never change it or its grade", async () => {
    const { exam: e, qs, correct, wrong } = await exam();
    const { id } = await start(e.slug);
    const q0 = qs[0];
    const oldCorrect = correct(0);
    const newCorrect = wrong(0);

    // An admin rewrites the stem and moves the answer key after the student started.
    await db.question.update({ where: { id: q0.id }, data: { stem: "EDITED STEM" } });
    await db.choice.update({ where: { id: oldCorrect }, data: { isCorrect: false } });
    await db.choice.update({ where: { id: newCorrect }, data: { isCorrect: true, text: "EDITED CHOICE" } });

    const loaded = await loadRunnerState(id, g1);
    if (loaded.kind !== "ok") throw new Error(loaded.kind);
    expect(loaded.state.questions[0].stem).not.toBe("EDITED STEM");
    expect(JSON.stringify(loaded.state)).not.toContain("EDITED");

    await syncAttempt(id, g1, { responses: [answer(q0.id, oldCorrect)], highlights: [] });
    await submitAttempt(id, g1);
    const out = await getResults(id, g1);
    if (out.kind !== "ok") throw new Error(out.kind);
    // Graded against the key the student saw.
    expect(out.results.items[0]).toMatchObject({ isCorrect: true, revised: false });
    expect(out.results.items[0].stem).not.toBe("EDITED STEM");

    // A new attempt gets the new content; the old one now notes the revision but keeps its grade.
    const second = await start(e.slug);
    const fresh = await loadRunnerState(second.id, g1);
    if (fresh.kind !== "ok") throw new Error(fresh.kind);
    expect(fresh.state.questions[0].stem).toBe("EDITED STEM");
    const again = await getResults(id, g1);
    if (again.kind !== "ok") throw new Error(again.kind);
    expect(again.results.items[0]).toMatchObject({ isCorrect: true, revised: true });
    expect(await db.questionVersion.count({ where: { questionId: q0.id } })).toBe(2);
  });

  it("reuses one version for identical content", async () => {
    const { exam: e, qs } = await exam();
    await start(e.slug);
    await start(e.slug);
    expect(await db.questionVersion.count()).toBe(qs.length);
  });

  it("a parked attempt never shows draft content written after it started (security finding 3)", async () => {
    const { exam: e, qs, correct } = await exam();
    const { id } = await start(e.slug);
    // Unpublish the exam, move its questions to draft and rewrite them, as an admin could.
    await db.exam.update({ where: { id: e.id }, data: { status: "DRAFT" } });
    await db.question.updateMany({ where: { id: { in: qs.map((q) => q.id) } }, data: { status: "DRAFT", stem: "SECRET DRAFT STEM", explanation: "SECRET DRAFT EXPLANATION" } });
    await db.choice.updateMany({ where: { questionId: qs[0].id }, data: { rationale: "SECRET DRAFT RATIONALE" } });

    const loaded = await loadRunnerState(id, g1);
    expect(JSON.stringify(loaded)).not.toContain("SECRET");
    await syncAttempt(id, g1, { responses: [answer(qs[0].id, correct(0))], highlights: [] });
    await submitAttempt(id, g1);
    expect(JSON.stringify(await getResults(id, g1))).not.toContain("SECRET");
  });

  it("attempts from before versioning still load and grade from live content", async () => {
    const { exam: e, qs, correct } = await exam();
    const { id } = await start(e.slug);
    await db.attempt.update({ where: { id }, data: { questionVersionIds: [] } });
    const loaded = await loadRunnerState(id, g1);
    expect(loaded.kind).toBe("ok");
    await syncAttempt(id, g1, { responses: [answer(qs[0].id, correct(0))], highlights: [] });
    await submitAttempt(id, g1);
    expect((await db.attempt.findUniqueOrThrow({ where: { id } })).correctCount).toBe(1);
  });
});

describe("autosave and submit", () => {
  beforeEach(async () => {
    await resetData();
    await seedSampleBank("PUBLISHED");
  });

  it("newest change wins: a stale tab or old backup can't overwrite a later answer", async () => {
    const { exam: e, qs, correct, wrong } = await exam();
    const { id } = await start(e.slug);
    await ageAttempt(id);
    const t0 = Date.now() - 10_000;
    await syncAttempt(id, g1, { responses: [answer(qs[0].id, correct(0), { changedAt: t0 + 5000, timeSpentMs: 3000 })], highlights: [] });
    // A stale copy arrives later but was made earlier.
    await syncAttempt(id, g1, { responses: [answer(qs[0].id, wrong(0), { changedAt: t0, timeSpentMs: 7000 })], highlights: [] });
    const r = await db.response.findFirstOrThrow({ where: { attemptId: id, questionId: qs[0].id } });
    expect(r.selectedChoiceId).toBe(correct(0));
    // Time on the question still merges: it only grows.
    expect(r.timeSpentMs).toBe(7000);
  });

  it("rapid changes keep the last one", async () => {
    const { exam: e, qs } = await exam();
    const { id } = await start(e.slug);
    await ageAttempt(id);
    const base = Date.now() - 5000;
    const picks = qs[1].choices.map((c) => c.id);
    for (let i = 0; i < 12; i++) {
      await syncAttempt(id, g1, { responses: [answer(qs[1].id, picks[i % 4], { changedAt: base + i * 10 })], highlights: [] });
    }
    expect((await db.response.findFirstOrThrow({ where: { attemptId: id, questionId: qs[1].id } })).selectedChoiceId).toBe(picks[11 % 4]);
  });

  it("a change can't claim a future time to outrank later changes", async () => {
    const { exam: e, qs, correct, wrong } = await exam();
    const { id } = await start(e.slug);
    await ageAttempt(id);
    await syncAttempt(id, g1, { responses: [answer(qs[0].id, wrong(0), { changedAt: Date.now() + 86_400_000 })], highlights: [] });
    await syncAttempt(id, g1, { responses: [answer(qs[0].id, correct(0), { changedAt: Date.now() })], highlights: [] });
    expect((await db.response.findFirstOrThrow({ where: { attemptId: id, questionId: qs[0].id } })).selectedChoiceId).toBe(correct(0));
  });

  it("submit applies the last unsaved changes and scores them in one step", async () => {
    const { exam: e, qs, correct } = await exam();
    const { id } = await start(e.slug);
    const result = await submitAttempt(id, g1, { payload: { responses: [answer(qs[0].id, correct(0)), answer(qs[1].id, correct(1))], highlights: [] } });
    expect(result).toEqual({ status: "submitted", autoSubmitted: false });
    expect((await db.attempt.findUniqueOrThrow({ where: { id } })).correctCount).toBe(2);
  });

  it("a duplicate submit with a different payload doesn't change the score", async () => {
    const { exam: e, qs, correct, wrong } = await exam();
    const { id } = await start(e.slug);
    await submitAttempt(id, g1, { payload: { responses: [answer(qs[0].id, correct(0))], highlights: [] } });
    await submitAttempt(id, g1, { payload: { responses: [answer(qs[0].id, wrong(0)), answer(qs[1].id, correct(1))], highlights: [] } });
    const a = await db.attempt.findUniqueOrThrow({ where: { id } });
    expect(a.correctCount).toBe(1);
  });

  it("a timeout submit before the server's deadline is refused and returns the real deadline", async () => {
    const { exam: e } = await exam();
    const { id } = await start(e.slug, "TIMED");
    const r = await submitAttempt(id, g1, { reason: "timeout" });
    expect(r.status).toBe("not_expired");
    expect((await db.attempt.findUniqueOrThrow({ where: { id } })).status).toBe("IN_PROGRESS");
    // A manual submit is always honored.
    expect((await submitAttempt(id, g1, { reason: "manual" })).status).toBe("submitted");
  });

  it("after the deadline, answers made in time are still delivered; later ones are not", async () => {
    const { exam: e, qs, correct } = await exam();
    const { id } = await start(e.slug, "TIMED");
    const deadline = Date.now() - 2 * 60_000;
    await db.attempt.update({ where: { id }, data: { startedAt: new Date(deadline - 13 * 60_000), deadlineAt: new Date(deadline) } });
    const r = await submitAttempt(id, g1, {
      reason: "timeout",
      payload: { responses: [answer(qs[0].id, correct(0), { changedAt: deadline - 30_000 }), answer(qs[1].id, correct(1), { changedAt: deadline + 30_000 })], highlights: [] },
    });
    expect(r).toEqual({ status: "submitted", autoSubmitted: true });
    const a = await db.attempt.findUniqueOrThrow({ where: { id }, include: { responses: true } });
    expect(a.correctCount).toBe(1);
    expect(a.submittedAt!.getTime()).toBe(deadline);
  });

  it("outside the late-delivery window nothing more is accepted", async () => {
    const { exam: e, qs, correct } = await exam();
    const { id } = await start(e.slug, "TIMED");
    const deadline = Date.now() - 20 * 60_000;
    await db.attempt.update({ where: { id }, data: { startedAt: new Date(deadline - 13 * 60_000), deadlineAt: new Date(deadline) } });
    const r = await syncAttempt(id, g1, { responses: [answer(qs[0].id, correct(0), { changedAt: deadline - 1000 })], highlights: [] });
    expect(r).toEqual({ ok: false, status: "SUBMITTED", reason: "time_expired" });
    expect((await db.attempt.findUniqueOrThrow({ where: { id } })).correctCount).toBe(0);
  });

  it("a signed-out request on an account's attempt is told to sign in, not that it's gone", async () => {
    const { exam: e, qs, correct } = await exam();
    const user = await db.user.create({ data: { email: "s@test.local", passwordHash: "x" } });
    const { id } = await start(e.slug, "UNTIMED", { userId: user.id, guestKeyHash: null });
    const signedOut: Viewer = { userId: null, guestKeyHash: "some-guest", isAdmin: false };
    await expect(syncAttempt(id, signedOut, { responses: [answer(qs[0].id, correct(0))], highlights: [] })).rejects.toMatchObject({ code: "signed_out" });
    expect((await loadRunnerState(id, signedOut)).kind).toBe("signed_out");
    // Another account is not the owner either way.
    await expect(syncAttempt(id, { userId: "someone-else", guestKeyHash: null, isAdmin: false }, { responses: [], highlights: [] })).rejects.toMatchObject({ code: "not_found" });
  });

  it("the daily job closes attempts abandoned past their deadline and late window", async () => {
    const { exam: e } = await exam();
    const old = await start(e.slug, "TIMED");
    const recent = await start(e.slug, "TIMED");
    await db.attempt.update({ where: { id: old.id }, data: { deadlineAt: new Date(Date.now() - 30 * 60_000) } });
    await db.attempt.update({ where: { id: recent.id }, data: { deadlineAt: new Date(Date.now() - 60_000) } });
    expect(await closeExpiredAttempts()).toBe(1);
    expect((await db.attempt.findUniqueOrThrow({ where: { id: old.id } })).status).toBe("SUBMITTED");
    expect((await db.attempt.findUniqueOrThrow({ where: { id: recent.id } })).status).toBe("IN_PROGRESS");
  });
});

describe("review and retest", () => {
  beforeEach(async () => {
    await resetData();
    await seedSampleBank("PUBLISHED");
  });

  it("retests the missed questions, untimed and linked, and keeps a history", async () => {
    const { exam: e, qs, correct, wrong } = await exam();
    const { id } = await start(e.slug, "TIMED");
    await submitAttempt(id, g1, { payload: { responses: [answer(qs[0].id, correct(0)), answer(qs[1].id, wrong(1))], highlights: [] } });

    const retest = await startRetest(id, g1);
    const r = await db.attempt.findUniqueOrThrow({ where: { id: retest.id } });
    expect(r).toMatchObject({ mode: "UNTIMED", retestOfId: id, deadlineAt: null });
    expect(r.questionOrder).toEqual(qs.slice(1).map((q) => q.id));
    await submitAttempt(retest.id, g1, { payload: { responses: [answer(qs[1].id, correct(1))], highlights: [] } });

    const original = await getResults(id, g1);
    if (original.kind !== "ok") throw new Error(original.kind);
    expect(original.results.retests).toEqual([expect.objectContaining({ id: retest.id, correctCount: 1, totalCount: qs.length - 1 })]);
    const rr = await getResults(retest.id, g1);
    if (rr.kind !== "ok") throw new Error(rr.kind);
    expect(rr.results.retestOf).toMatchObject({ id, correctCount: 1 });
    // Only the owner can retest, and only a finished attempt.
    await expect(startRetest(id, guest("intruder"))).rejects.toMatchObject({ code: "not_found" });
    const open = await start(e.slug);
    await expect(startRetest(open.id, g1)).rejects.toMatchObject({ code: "unavailable" });
  });

  it("names the misconception behind a wrong choice when one is mapped", async () => {
    const { exam: e, qs, wrong } = await exam();
    const m = await db.misconception.create({ data: { slug: "m-test", name: "Mixes up pH and pKa", description: "d".repeat(12), remediation: "r".repeat(12) } });
    await db.choice.update({ where: { id: wrong(0) }, data: { misconceptionId: m.id } });
    const { id } = await start(e.slug);
    await submitAttempt(id, g1, { payload: { responses: [answer(qs[0].id, wrong(0))], highlights: [] } });
    const out = await getResults(id, g1);
    if (out.kind !== "ok") throw new Error(out.kind);
    expect(out.results.items[0].misconception).toBe("Mixes up pH and pKa");
    expect(out.results.items[1].misconception).toBeNull();
  });
});

describe("contact-message retention", () => {
  beforeEach(resetData);

  it("only reports by default, and deletes closed messages past the period once enabled", async () => {
    const old = new Date(Date.now() - 120 * 86_400_000);
    const mk = (status: "NEW" | "RESOLVED" | "SPAM", updatedAt: Date) =>
      db.inquiry.create({ data: { name: "N", email: `${status}-${updatedAt.getTime()}@x.test`, kind: "OTHER", message: "m", status, updatedAt } });
    const resolvedOld = await mk("RESOLVED", old);
    await db.emailMessage.create({ data: { template: "inquiry-ack", to: "RESOLVED@x.test", subject: "s", status: "SENT", inquiryId: resolvedOld.id } });
    await mk("SPAM", old);
    await mk("NEW", old);
    await mk("RESOLVED", new Date());

    expect(inquiryPolicy({})).toEqual({ days: 90, enabled: false });
    const dry = await purgeInquiries(db, inquiryPolicy({}));
    expect(dry).toEqual({ retentionDays: 90, enabled: false, eligible: 2, deleted: 0, openPastRetention: 1 });
    expect(await db.inquiry.count()).toBe(4);

    const live = await purgeInquiries(db, inquiryPolicy({ INQUIRY_PURGE: "on", INQUIRY_RETENTION_DAYS: "90" }));
    expect(live.deleted).toBe(2);
    expect(await db.inquiry.count()).toBe(2);
    expect(await db.emailMessage.count()).toBe(0);
  });
});
