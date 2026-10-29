import { beforeEach, describe, expect, it } from "vitest";
import { importBank } from "@/lib/content/import";
import { db, resetData, sampleBank, seedSampleBank } from "../support/db";

describe("content import", () => {
  beforeEach(resetData);

  it("imports the sample bank with exam order and one correct choice per question", async () => {
    const summary = await seedSampleBank("REVIEW");
    expect(summary).toMatchObject({ exams: 3, passages: 3, questions: 24, status: "REVIEW" });
    const exam = await db.exam.findUniqueOrThrow({
      where: { slug: "cp-sample-set-1" },
      include: { items: { orderBy: { position: "asc" }, include: { question: { include: { choices: true } } } } },
    });
    expect(exam.status).toBe("REVIEW");
    expect(exam.timeLimitSec).toBe(13 * 60);
    expect(exam.items.map((i) => i.question.externalId).slice(0, 5)).toEqual([
      "cp-q-bicarbonate-ph",
      "cp-q-hyperventilation",
      "cp-q-renal-compensation",
      "cp-q-carbonic-anhydrase",
      "cp-q-free-fall",
    ]);
    for (const item of exam.items) expect(item.question.choices.filter((c) => c.isCorrect)).toHaveLength(1);
  });

  it("re-importing updates in place and keeps choice ids stable", async () => {
    await seedSampleBank();
    const before = await db.choice.findMany({ orderBy: { id: "asc" }, select: { id: true } });
    const bank = sampleBank();
    bank.exams[0].items[1].stem = "Edited stem";
    await importBank(db, bank, "PUBLISHED");
    const after = await db.choice.findMany({ orderBy: { id: "asc" }, select: { id: true } });
    expect(after).toEqual(before);
    expect(await db.question.count()).toBe(24);
    expect((await db.question.findUniqueOrThrow({ where: { externalId: "cp-q-free-fall" } })).stem).toBe("Edited stem");
  });

  it("writes nothing when the file is invalid", async () => {
    const bank = sampleBank();
    bank.exams[2].items[1].topics = ["missing-topic"];
    await expect(importBank(db, bank)).rejects.toThrow(/unknown topic/);
    expect(await db.question.count()).toBe(0);
  });
});
