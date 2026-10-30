import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { convertFullLength, type SourceQuestion } from "@/lib/content/fl-convert";
import { importBank } from "@/lib/content/import";
import { markExamsReviewed } from "@/lib/content/review";
import { startAttempt } from "@/lib/exam/service";
import { db, resetData } from "../support/db";

const SLUGS = ["fl1-cp", "fl1-bb", "fl1-ps"];

// FL1 as production had it before Shabari's review: published, every question reviewed:false.
async function importUnreviewedFl1() {
  const source: SourceQuestion[] = ["cp", "bb", "ps"].flatMap((s) => JSON.parse(readFileSync(`content/questions/fl1-${s}.json`, "utf8")));
  const { bank } = convertFullLength("fl1", source.map((q) => ({ ...q, reviewed: false })));
  await importBank(db, bank, "PUBLISHED");
}

describe("recording Shabari's review of a practice set", () => {
  beforeEach(async () => {
    await resetData();
    await importUnreviewedFl1();
  });

  it("clears the label and stamps the questions, leaving status, versions and attempts as they were", async () => {
    const admin = await db.user.create({ data: { email: "admin@example.com", passwordHash: "x", role: "ADMIN" } });
    expect(await db.exam.count({ where: { slug: { in: SLUGS }, underReview: true } })).toBe(3);
    const { id: attemptId } = await startAttempt({ examSlug: "fl1-cp", mode: "UNTIMED" }, { userId: null, guestKeyHash: "g1" });
    const attemptBefore = await db.attempt.findUniqueOrThrow({ where: { id: attemptId } });
    const versionsBefore = await db.questionVersion.count();

    const summary = await markExamsReviewed(db, SLUGS, admin, "test");
    expect(summary).toEqual(SLUGS.map((slug) => ({ slug, wasUnderReview: true, questionsMarked: 59 })));

    const exams = await db.exam.findMany({ where: { slug: { in: SLUGS } }, select: { status: true, underReview: true } });
    expect(exams).toEqual(SLUGS.map(() => ({ status: "PUBLISHED", underReview: false })));
    expect(await db.question.count({ where: { externalId: { startsWith: "fl1-" }, reviewedAt: { not: null }, reviewedById: admin.id } })).toBe(177);
    expect(await db.questionVersion.count()).toBe(versionsBefore);
    expect(await db.attempt.findUniqueOrThrow({ where: { id: attemptId } })).toEqual(attemptBefore);

    const log = await db.auditLog.findMany({ where: { action: "exam.review" }, orderBy: { createdAt: "asc" } });
    expect(log.map((l) => [l.actorEmail, l.entityType, (l.metadata as { slug: string }).slug])).toEqual(SLUGS.map((s) => ["admin@example.com", "Exam", s]));

    // Running it again changes nothing but the log.
    expect(await markExamsReviewed(db, SLUGS, admin, "test")).toEqual(SLUGS.map((slug) => ({ slug, wasUnderReview: false, questionsMarked: 0 })));
  });

  it("writes nothing when a slug is unknown", async () => {
    const admin = await db.user.create({ data: { email: "admin@example.com", passwordHash: "x", role: "ADMIN" } });
    await expect(markExamsReviewed(db, [...SLUGS, "fl9-cp"], admin, "test")).rejects.toThrow(/fl9-cp/);
    expect(await db.exam.count({ where: { underReview: true } })).toBe(3);
    expect(await db.question.count({ where: { reviewedAt: { not: null } } })).toBe(0);
    expect(await db.auditLog.count()).toBe(0);
  });
});
