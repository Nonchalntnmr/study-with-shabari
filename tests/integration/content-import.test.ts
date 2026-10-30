import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { convertFullLength } from "@/lib/content/fl-convert";
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

  it("imports FL1 in review, with its passage captions", async () => {
    const source = ["cp", "bb", "ps"].flatMap((s) => JSON.parse(readFileSync(`content/questions/fl1-${s}.json`, "utf8")));
    const { bank } = convertFullLength("fl1", source);
    expect(await importBank(db, bank, "REVIEW")).toMatchObject({ exams: 3, passages: 30, questions: 177, status: "REVIEW" });
    const exams = await db.exam.findMany({ where: { slug: { startsWith: "fl1-" } }, select: { slug: true, status: true, timeLimitSec: true, underReview: true } });
    // Shabari has reviewed every question (reviewed:true), so no set carries the "being reviewed" label.
    expect(exams.map((e) => [e.slug, e.status, e.timeLimitSec, e.underReview]).sort()).toEqual([["fl1-bb", "REVIEW", 5700, false], ["fl1-cp", "REVIEW", 5700, false], ["fl1-ps", "REVIEW", 5700, false]]);
    expect(await db.question.count({ where: { externalId: { startsWith: "fl1-" }, status: { not: "REVIEW" } } })).toBe(0);
    const p = await db.passage.findUniqueOrThrow({ where: { externalId: "fl1-cp-p01" } });
    expect(p.figureText).toMatch(/^Table 1: \[S\] \(mM\) vs v0/);
    expect((await db.passage.findUniqueOrThrow({ where: { externalId: "fl1-cp-p02" } })).figureText).toBeNull();
  });

  it("writes nothing when the file is invalid", async () => {
    const bank = sampleBank();
    bank.exams[2].items[1].topics = ["missing-topic"];
    await expect(importBank(db, bank)).rejects.toThrow(/unknown topic/);
    expect(await db.question.count()).toBe(0);
  });
});
