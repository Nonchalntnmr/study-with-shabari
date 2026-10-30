import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { importLesson } from "@/lib/lessons/import";
import { publishLesson } from "@/lib/lessons/publish";
import { answerLessonStep, findLesson, loadLessonAttempt, startLessonAttempt, startPreviewAttempt } from "@/lib/lessons/service";
import { lessonResult } from "@/lib/lessons/flow";
import { isLocalTestDatabase } from "../../scripts/publish-lesson-fixture";
import { db, resetData } from "../support/db";

const lessonFile = () => JSON.parse(readFileSync("content/lessons/dopamine.json", "utf8"));

async function admin() {
  const u = await db.user.create({ data: { email: "admin@test.local", passwordHash: "x", role: "ADMIN" } });
  return { id: u.id, email: u.email, role: u.role };
}

const guest = { userId: null, guestKeyHash: "guest-hash-1" };
const viewer = { ...guest, isAdmin: false };

describe("lessons", () => {
  beforeEach(resetData);

  it("imports the dopamine lesson as an unreviewed AI draft that students can't see", async () => {
    const summary = await importLesson(db, lessonFile());
    expect(summary).toMatchObject({ misconceptions: 8, questions: 7, steps: 13 });
    const lesson = await db.lesson.findUniqueOrThrow({ where: { slug: "dopamine" } });
    expect(lesson).toMatchObject({ status: "REVIEW", authoredBy: "AI", publishedVersionId: null });
    const questions = await db.question.findMany({ where: { lessonSteps: { some: { lessonId: lesson.id } } } });
    expect(questions.every((q) => q.authoredBy === "AI" && q.status === "REVIEW" && q.reviewedById === null)).toBe(true);
    const mapped = lessonFile().questions.flatMap((q: { choices: { misconception?: string }[] }) => q.choices).filter((c: { misconception?: string }) => c.misconception).length;
    expect(await db.choice.count({ where: { misconceptionId: { not: null } } })).toBe(mapped);
    expect(await findLesson("dopamine", false)).toBeNull();
    expect((await findLesson("dopamine", true))?.mode).toBe("preview");
  });

  it("publishes only with an admin's review attestation, and records it", async () => {
    const { lessonId } = await importLesson(db, lessonFile());
    const a = await admin();
    const student = await db.user.create({ data: { email: "s@test.local", passwordHash: "x" } });

    expect(await publishLesson(db, lessonId, { id: student.id, email: student.email, role: "STUDENT" }, true)).toMatchObject({ ok: false, problems: [expect.stringMatching(/Only an admin/)] });
    expect(await publishLesson(db, lessonId, a, false)).toMatchObject({ ok: false, problems: [expect.stringMatching(/AI-drafted/)] });
    expect(await db.lessonVersion.count()).toBe(0);

    const ok = await publishLesson(db, lessonId, a, true);
    expect(ok).toMatchObject({ ok: true, version: 1 });
    const questions = await db.question.findMany({ where: { lessonSteps: { some: { lessonId } } } });
    expect(questions.every((q) => q.reviewedById === a.id && q.status === "PUBLISHED")).toBe(true);
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "lesson.publish" } });
    expect(log).toMatchObject({ actorId: a.id, entityId: lessonId, metadata: expect.objectContaining({ version: 1, aiContent: true, attestedReview: true }) });
    expect((await findLesson("dopamine", false))?.mode).toBe("published");
  });

  it("grades on the server against the approved snapshot, even after the draft changes", async () => {
    const { lessonId } = await importLesson(db, lessonFile());
    const a = await admin();
    await publishLesson(db, lessonId, a, true);
    const { id } = await startLessonAttempt("dopamine", guest, false);

    // Edit the draft after the student started: their attempt stays on version 1.
    const m = await db.misconception.findUniqueOrThrow({ where: { slug: "amine-neutral-at-body-ph" } });
    await db.misconception.update({ where: { id: m.id }, data: { name: "Edited name" } });

    await answerLessonStep(id, viewer, { position: 1, choiceLabel: "A", confidence: "SURE", elapsedMs: 4000 });
    // A second submission can't change the first answer.
    await answerLessonStep(id, viewer, { position: 1, choiceLabel: "C", confidence: "SURE", elapsedMs: 1 });
    // Can't skip ahead past an unanswered question.
    await expect(answerLessonStep(id, viewer, { position: 7, choiceLabel: "A", confidence: "SURE", elapsedMs: 0 })).rejects.toThrow("invalid");
    // Someone else's browser can't see or answer it.
    expect(await loadLessonAttempt(id, { userId: null, guestKeyHash: "other", isAdmin: false })).toBeNull();

    const loaded = (await loadLessonAttempt(id, viewer))!;
    expect(loaded.answers).toEqual([expect.objectContaining({ stepPosition: 1, choiceLabel: "A", isCorrect: false, misconceptionId: m.id })]);
    const row = await db.lessonAnswer.findFirstOrThrow({ where: { attemptId: id } });
    expect(row.timeMs).toBe(4000);
    const r = lessonResult(loaded.snapshot, loaded.answers);
    expect(r.misconceptions[0].name).toBe("Treats the amine as neutral at physiological pH");
  });

  it("completes the attempt and counts the funnel without identifiers", async () => {
    const { lessonId } = await importLesson(db, lessonFile());
    await publishLesson(db, lessonId, await admin(), true);
    const { id } = await startLessonAttempt("dopamine", guest, false);
    const { snapshot } = (await loadLessonAttempt(id, viewer))!;
    for (const st of snapshot.steps.filter((s) => s.question)) {
      const correct = st.question!.choices.find((c) => c.isCorrect)!.label;
      await answerLessonStep(id, viewer, { position: st.position, choiceLabel: correct, confidence: "UNSURE", elapsedMs: 1000 });
    }
    expect((await db.lessonAttempt.findUniqueOrThrow({ where: { id } })).completedAt).not.toBeNull();
    const funnel = Object.fromEntries((await db.funnelDaily.findMany()).map((f) => [f.event, f.count]));
    expect(funnel).toEqual({ lesson_started: 1, lesson_answered: 7, lesson_completed: 1 });
    const columns = await db.$queryRaw<{ column_name: string }[]>`SELECT column_name FROM information_schema.columns WHERE table_name = 'FunnelDaily'`;
    expect(columns.map((c) => c.column_name).sort()).toEqual(["count", "day", "event"]);
  });

  it("doesn't count preview attempts", async () => {
    await importLesson(db, lessonFile());
    await startLessonAttempt("dopamine", guest, true);
    expect(await db.funnelDaily.count()).toBe(0);
  });

  it("lets an admin play the current draft as a preview that only the admin role opens, and never counts it", async () => {
    const { lessonId } = await importLesson(db, lessonFile());
    const a = await admin();
    const { id } = await startPreviewAttempt(lessonId, a.id);
    const asAdmin = { userId: a.id, guestKeyHash: null, isAdmin: true };
    expect((await loadLessonAttempt(id, asAdmin))?.mode).toBe("preview");
    // The public lesson URLs load attempts without the admin role, so a draft preview doesn't open there.
    expect(await loadLessonAttempt(id, { ...asAdmin, isAdmin: false })).toBeNull();
    // Answering reports where the attempt lives, so the action can send the admin back to the preview.
    expect(await answerLessonStep(id, asAdmin, { position: 1, choiceLabel: "A", confidence: "SURE", elapsedMs: 1 })).toEqual({ lessonId, mode: "preview" });
    expect(await db.funnelDaily.count()).toBe(0);
    await expect(startPreviewAttempt("no-such-lesson", a.id)).rejects.toThrow("not_found");
  });

  it("only lets the E2E fixture publish into a local test database", () => {
    expect(isLocalTestDatabase("postgresql://shabari@127.0.0.1:54329/sws_e2e")).toBe(true);
    expect(isLocalTestDatabase("postgresql://shabari@localhost:54329/sws_test")).toBe(true);
    expect(isLocalTestDatabase("postgresql://shabari@127.0.0.1:54329/sws_dev")).toBe(false);
    expect(isLocalTestDatabase("postgresql://postgres.x@aws-0-us-east-1.pooler.supabase.com:5432/postgres_test")).toBe(false);
  });
});
