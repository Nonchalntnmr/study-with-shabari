import { beforeEach, describe, expect, it } from "vitest";
import { getResults, loadRunnerState, startAttempt, submitAttempt, syncAttempt, type Viewer } from "@/lib/exam/service";
import { db, resetData, seedSampleBank } from "../support/db";

const guest = (key: string): Viewer => ({ userId: null, guestKeyHash: key, isAdmin: false });

async function examWithAnswers(slug = "cp-sample-set-1") {
  const exam = await db.exam.findUniqueOrThrow({
    where: { slug },
    include: { items: { orderBy: { position: "asc" }, include: { question: { include: { choices: true } } } } },
  });
  const questions = exam.items.map((i) => i.question);
  const correct = (i: number) => questions[i].choices.find((c) => c.isCorrect)!.id;
  const wrong = (i: number) => questions[i].choices.find((c) => !c.isCorrect)!.id;
  return { exam, questions, correct, wrong };
}

const answer = (questionId: string, selectedChoiceId: string | null, extra: Partial<{ flagged: boolean; eliminatedChoiceIds: string[]; timeSpentMs: number }> = {}) => ({
  questionId,
  selectedChoiceId,
  eliminatedChoiceIds: extra.eliminatedChoiceIds ?? [],
  flagged: extra.flagged ?? false,
  timeSpentMs: extra.timeSpentMs ?? 0,
});

describe("attempt lifecycle", () => {
  beforeEach(async () => {
    await resetData();
    await seedSampleBank("PUBLISHED");
  });

  it("guests can start published exams; unpublished ones are hidden except to admins", async () => {
    const { exam } = await examWithAnswers();
    const { id } = await startAttempt({ examId: exam.id, mode: "TIMED" }, { userId: null, guestKeyHash: "g1" });
    const attempt = await db.attempt.findUniqueOrThrow({ where: { id } });
    expect(attempt.questionOrder).toHaveLength(8);
    expect(attempt.deadlineAt!.getTime() - attempt.startedAt.getTime()).toBe(13 * 60_000);

    await db.exam.update({ where: { id: exam.id }, data: { status: "DRAFT" } });
    await expect(startAttempt({ examId: exam.id, mode: "UNTIMED" }, { userId: null, guestKeyHash: "g1" })).rejects.toThrow("not_found");
    const admin = await db.user.create({ data: { email: "admin@example.com", passwordHash: "x", role: "ADMIN" } });
    const preview = await startAttempt({ examId: exam.id, mode: "UNTIMED" }, { userId: admin.id, guestKeyHash: null }, true);
    expect((await db.attempt.findUniqueOrThrow({ where: { id: preview.id } })).userId).toBe(admin.id);
  });

  it("the runner payload never contains answers or explanations", async () => {
    const { exam } = await examWithAnswers();
    const { id } = await startAttempt({ examId: exam.id, mode: "UNTIMED" }, { userId: null, guestKeyHash: "g1" });
    const loaded = await loadRunnerState(id, guest("g1"));
    expect(loaded.kind).toBe("ok");
    const json = JSON.stringify(loaded);
    expect(json).not.toMatch(/isCorrect|rationale|explanation/);
    if (loaded.kind === "ok") {
      expect(loaded.state.questions[0].passageId).toBeTruthy();
      expect(Object.keys(loaded.state.passages)).toHaveLength(1);
      expect(loaded.state.questions[0].choices.map((c) => c.label)).toEqual(["A", "B", "C", "D"]);
    }
  });

  it("only the owner can load, save or submit", async () => {
    const { exam, questions, correct } = await examWithAnswers();
    const { id } = await startAttempt({ examId: exam.id, mode: "UNTIMED" }, { userId: null, guestKeyHash: "owner" });
    expect((await loadRunnerState(id, guest("intruder"))).kind).toBe("not_found");
    expect((await loadRunnerState(id, { userId: null, guestKeyHash: null, isAdmin: false })).kind).toBe("not_found");
    await expect(syncAttempt(id, guest("intruder"), { responses: [answer(questions[0].id, correct(0))], highlights: [] })).rejects.toThrow("not_found");
    await expect(submitAttempt(id, guest("intruder"))).rejects.toThrow("not_found");
    expect((await getResults(id, guest("intruder"))).kind).toBe("not_found");
  });

  it("autosave persists answers, eliminations, flags and highlights, and survives a reload", async () => {
    const { exam, questions, correct, wrong } = await examWithAnswers();
    const { id } = await startAttempt({ examId: exam.id, mode: "UNTIMED" }, { userId: null, guestKeyHash: "g1" });
    const passageId = questions[0].passageId!;
    const res = await syncAttempt(id, guest("g1"), {
      responses: [answer(questions[0].id, correct(0), { eliminatedChoiceIds: [wrong(0), wrong(0)], flagged: true, timeSpentMs: 4000 })],
      highlights: [{ passageId, ranges: [{ p: 0, s: 0, e: 5 }, { p: 0, s: 3, e: 9 }, { p: 99, s: 0, e: 1 }] }],
      lastPosition: 3,
    });
    expect(res.ok).toBe(true);

    const reloaded = await loadRunnerState(id, guest("g1"));
    if (reloaded.kind !== "ok") throw new Error("expected ok");
    expect(reloaded.state.responses[questions[0].id]).toMatchObject({
      selectedChoiceId: correct(0),
      eliminatedChoiceIds: [wrong(0)],
      flagged: true,
    });
    expect(reloaded.state.highlights[passageId]).toEqual([{ p: 0, s: 0, e: 9 }]);
    expect(reloaded.state.lastPosition).toBe(3);
  });

  it("rejects choices from another question and questions outside the attempt", async () => {
    const { exam, questions, correct } = await examWithAnswers();
    const other = await examWithAnswers("bb-sample-set-1");
    const { id } = await startAttempt({ examId: exam.id, mode: "UNTIMED" }, { userId: null, guestKeyHash: "g1" });
    await expect(syncAttempt(id, guest("g1"), { responses: [answer(questions[0].id, correct(1))], highlights: [] })).rejects.toThrow("Unknown choice");
    await expect(syncAttempt(id, guest("g1"), { responses: [answer(other.questions[0].id, other.correct(0))], highlights: [] })).rejects.toThrow("not part of this attempt");
    await expect(syncAttempt(id, guest("g1"), { responses: [], highlights: [{ passageId: other.questions[0].passageId!, ranges: [] }] })).rejects.toThrow("not part of this attempt");
  });

  it("scores on submit, is idempotent, and refuses writes afterwards", async () => {
    const { exam, questions, correct, wrong } = await examWithAnswers();
    const { id } = await startAttempt({ examId: exam.id, mode: "UNTIMED" }, { userId: null, guestKeyHash: "g1" });
    await syncAttempt(id, guest("g1"), {
      responses: [answer(questions[0].id, correct(0)), answer(questions[1].id, correct(1)), answer(questions[2].id, wrong(2))],
      highlights: [],
    });
    expect(await submitAttempt(id, guest("g1"))).toEqual({ autoSubmitted: false });
    expect(await submitAttempt(id, guest("g1"))).toEqual({ autoSubmitted: false });

    const attempt = await db.attempt.findUniqueOrThrow({ where: { id }, include: { responses: true } });
    expect(attempt).toMatchObject({ status: "SUBMITTED", correctCount: 2, totalCount: 8 });
    expect(attempt.responses).toHaveLength(8);
    expect(attempt.responses.filter((r) => r.isCorrect)).toHaveLength(2);

    const late = await syncAttempt(id, guest("g1"), { responses: [answer(questions[2].id, correct(2))], highlights: [] });
    expect(late).toEqual({ ok: false, status: "SUBMITTED", reason: "already_submitted" });
    expect((await db.attempt.findUniqueOrThrow({ where: { id } })).correctCount).toBe(2);
    expect((await loadRunnerState(id, guest("g1"))).kind).toBe("submitted");
  });

  it("results include explanations, the student's picks and an accurate topic breakdown", async () => {
    const { exam, questions, correct, wrong } = await examWithAnswers();
    const { id } = await startAttempt({ examId: exam.id, mode: "UNTIMED" }, { userId: null, guestKeyHash: "g1" });
    // Questions 1-3 are acid-base; answer two right and one wrong.
    await syncAttempt(id, guest("g1"), {
      responses: [answer(questions[0].id, correct(0)), answer(questions[1].id, correct(1)), answer(questions[2].id, wrong(2))],
      highlights: [],
    });
    await submitAttempt(id, guest("g1"));
    const out = await getResults(id, guest("g1"));
    if (out.kind !== "ok") throw new Error(out.kind);
    const r = out.results;
    expect(r).toMatchObject({ correct: 2, total: 8, answered: 3 });
    expect(r.items[0].explanation).toMatch(/Henderson–Hasselbalch/);
    expect(r.items[2].selectedChoiceId).toBe(wrong(2));
    expect(r.items[2].isCorrect).toBe(false);
    const acid = r.topics.find((t) => t.slug === "cp-acid-base")!;
    expect(acid).toMatchObject({ correct: 2, total: 3 });
    // Admins may read any result; other guests may not.
    expect((await getResults(id, { userId: "x", guestKeyHash: null, isAdmin: true })).kind).toBe("ok");
  });

  it("a timed attempt past its deadline is auto-submitted and scored at the deadline", async () => {
    const { exam, questions, correct } = await examWithAnswers();
    const { id } = await startAttempt({ examId: exam.id, mode: "TIMED" }, { userId: null, guestKeyHash: "g1" });
    await syncAttempt(id, guest("g1"), { responses: [answer(questions[0].id, correct(0))], highlights: [] });

    const deadline = new Date(Date.now() - 60_000);
    await db.attempt.update({ where: { id }, data: { startedAt: new Date(deadline.getTime() - 13 * 60_000), deadlineAt: deadline } });

    const late = await syncAttempt(id, guest("g1"), { responses: [answer(questions[1].id, correct(1))], highlights: [] });
    expect(late).toEqual({ ok: false, status: "SUBMITTED", reason: "time_expired" });
    const attempt = await db.attempt.findUniqueOrThrow({ where: { id } });
    expect(attempt).toMatchObject({ status: "SUBMITTED", autoSubmitted: true, correctCount: 1 });
    expect(attempt.submittedAt!.getTime()).toBe(deadline.getTime());
  });

  it("an expired attempt is closed when the student comes back to it", async () => {
    const { exam } = await examWithAnswers();
    const { id } = await startAttempt({ examId: exam.id, mode: "TIMED" }, { userId: null, guestKeyHash: "g1" });
    await db.attempt.update({ where: { id }, data: { deadlineAt: new Date(Date.now() - 1000) } });
    expect((await loadRunnerState(id, guest("g1"))).kind).toBe("submitted");
    expect((await db.attempt.findUniqueOrThrow({ where: { id } })).autoSubmitted).toBe(true);
  });

  it("concurrent submits score exactly once", async () => {
    const { exam, questions, correct } = await examWithAnswers();
    const { id } = await startAttempt({ examId: exam.id, mode: "UNTIMED" }, { userId: null, guestKeyHash: "g1" });
    await syncAttempt(id, guest("g1"), { responses: [answer(questions[0].id, correct(0))], highlights: [] });
    await Promise.all([submitAttempt(id, guest("g1")), submitAttempt(id, guest("g1")), submitAttempt(id, guest("g1"))]);
    expect(await db.response.count({ where: { attemptId: id } })).toBe(8);
    expect((await db.attempt.findUniqueOrThrow({ where: { id } })).correctCount).toBe(1);
  });
});
