import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lessonPublishProblems } from "@/lib/admin/rules";
import { suppressSmall, funnelDay } from "@/lib/funnel/events";
import { furthestStep, grade, lessonResult, remediationFor, resolveStep, reveal, type GivenAnswer } from "@/lib/lessons/flow";
import { parseLessonFile } from "@/lib/lessons/import";
import { previewAllowed } from "@/lib/lessons/preview";
import { diffSnapshots, forCheck, type LessonSnapshot, type SnapshotStep } from "@/lib/lessons/snapshot";

// Builds the snapshot the importer + buildSnapshot would produce, straight from the lesson file.
function snapshotFromFile(): LessonSnapshot {
  const f = parseLessonFile(JSON.parse(readFileSync("content/lessons/dopamine.json", "utf8")));
  const misconceptions = Object.fromEntries(f.misconceptions.map((m) => [m.slug, { id: `id-${m.slug}`, slug: m.slug, name: m.name, description: m.description, remediation: m.remediation, authoredBy: "AI" as const }]));
  const questions = new Map(f.questions.map((q) => [q.id, q]));
  const steps: SnapshotStep[] = f.steps.map((s, position) => {
    const q = "question" in s ? questions.get(s.question)! : null;
    return {
      position,
      kind: s.kind,
      concept: s.concept,
      title: "title" in s ? (s.title ?? null) : null,
      body: "body" in s ? s.body : null,
      figure: s.kind === "TEACH" ? (s.figure ?? null) : null,
      question: q
        ? {
            id: q.id,
            externalId: q.id,
            section: q.section,
            stem: q.stem,
            explanation: q.explanation,
            authoredBy: "AI",
            reviewedById: null,
            passage: q.passage ? { id: q.passage.id, title: q.passage.title, body: q.passage.body, source: null } : null,
            choices: q.choices.map((c) => ({ label: c.label, text: c.text, isCorrect: c.correct, rationale: c.rationale ?? null, misconception: c.misconception ?? null })),
          }
        : null,
    };
  });
  return { schema: 1, lessonId: "lesson", slug: f.lesson.slug, title: f.lesson.title, section: null, summary: f.lesson.summary, objectives: f.lesson.objectives, authoredBy: "AI", steps, misconceptions };
}

const s = snapshotFromFile();
const at = (kind: string, concept: string) => s.steps.find((st) => st.kind === kind && st.concept === concept)!;
const correctLabel = (st: SnapshotStep) => st.question!.choices.find((c) => c.isCorrect)!.label;

function answer(st: SnapshotStep, label: string, confidence: GivenAnswer["confidence"] = "SURE"): GivenAnswer {
  const g = grade(s, st.question!, label)!;
  return { stepPosition: st.position, choiceLabel: label, confidence, ...g };
}

describe("dopamine lesson content", () => {
  it("has three test/retest pairs plus one passage question, each test mapping a misconception", () => {
    const tests = s.steps.filter((st) => st.kind === "TEST");
    const retests = s.steps.filter((st) => st.kind === "RETEST");
    expect(tests).toHaveLength(4);
    expect(retests).toHaveLength(3);
    expect(tests.filter((t) => t.question?.passage)).toHaveLength(1);
    for (const r of retests) expect(r.question!.id).not.toBe(at("TEST", r.concept).question!.id);
  });

  it("passes the publish rules once reviewed, and not before", () => {
    expect(lessonPublishProblems(forCheck(s), true)).toEqual([]);
    const unreviewed = lessonPublishProblems(forCheck(s), false);
    expect(unreviewed).toHaveLength(7);
    expect(unreviewed[0]).toMatch(/drafted by AI/);
  });

  it("never labels the content as Shabari's", () => {
    const text = JSON.stringify(s);
    expect(text).not.toMatch(/Shabari/i);
  });
});

describe("lesson navigation", () => {
  it("unlocks steps up to the first unanswered question", () => {
    const test = at("TEST", "protonation");
    expect(furthestStep(s, new Set())).toBe(test.position);
    expect(resolveStep(s, new Set(), null)).toBe(0);
    expect(resolveStep(s, new Set(), 9)).toBe(test.position);
    expect(resolveStep(s, new Set(), 0)).toBe(0);
    // Resuming continues after the last answer; jumping ahead stops at the next unanswered question.
    expect(resolveStep(s, new Set([test.position]), null)).toBe(test.position + 1);
    expect(resolveStep(s, new Set([test.position]), 12)).toBe(at("RETEST", "protonation").position);
  });

  it("reaches the result once every question is answered", () => {
    const all = new Set(s.steps.filter((st) => st.question).map((st) => st.position));
    expect(furthestStep(s, all)).toBe(s.steps.length);
  });
});

describe("reveal and remediation", () => {
  const test = at("TEST", "protonation");

  it("names the misconception behind a wrong choice and explains the right one", () => {
    const r = reveal(s, test.question!, { choiceLabel: "A", confidence: "SURE" })!;
    expect(r.isCorrect).toBe(false);
    expect(r.correct.label).toBe("C");
    expect(r.misconception?.name).toBe("Treats the amine as neutral at physiological pH");
    expect(r.calibration).toBe("sure-wrong");
    expect(r.others.map((c) => c.label)).toEqual(["B", "D"]);
  });

  it("flags right-but-unsure answers", () => {
    expect(reveal(s, test.question!, { choiceLabel: "C", confidence: "GUESSING" })!.calibration).toBe("unsure-right");
    expect(reveal(s, test.question!, { choiceLabel: "C", confidence: "SURE" })!.calibration).toBeNull();
  });

  it("remediates the misconception the student actually showed", () => {
    const rem = remediationFor(s, at("REMEDIATE", "protonation"), [answer(test, "B")]);
    expect(rem).toMatchObject({ kind: "misconception", name: "Assumes equal amounts of acid and base" });
  });

  it("falls back to the explanation for a wrong answer with no mapped misconception", () => {
    const synthesis = at("TEST", "synthesis");
    const rem = remediationFor(s, at("REMEDIATE", "synthesis"), [answer(synthesis, "A")]);
    expect(rem?.kind).toBe("missed");
  });

  it("reinforces a correct answer", () => {
    expect(remediationFor(s, at("REMEDIATE", "protonation"), [answer(test, "C", "UNSURE")])).toMatchObject({ kind: "reinforce", unsure: true });
  });
});

describe("lesson result", () => {
  it("compares first try with retest and names misconceptions and confident misses", () => {
    const answers = s.steps.filter((st) => st.question).map((st) => (st.concept === "protonation" && st.kind === "TEST" ? answer(st, "A", "SURE") : answer(st, correctLabel(st), "UNSURE")));
    const r = lessonResult(s, answers);
    expect(r.complete).toBe(true);
    expect(r.answered).toBe(7);
    const row = r.concepts.find((c) => c.concept === "protonation")!;
    expect(row.label).toBe("The amine's charge at body pH");
    expect(row.first).toMatchObject({ isCorrect: false, label: "A", confidence: "SURE", misconception: "Treats the amine as neutral at physiological pH" });
    expect(row.retest).toMatchObject({ isCorrect: true });
    expect(r.concepts.find((c) => c.concept === "levodopa-therapy")!.retest).toBeNull();
    expect(r.misconceptions.map((m) => m.name)).toEqual(["Treats the amine as neutral at physiological pH"]);
    expect(r.sureWrong).toEqual(["The amine's charge at body pH"]);
    expect(r.missedSections).toEqual(["CP"]);
  });

  it("is incomplete until every question is answered", () => {
    expect(lessonResult(s, [answer(at("TEST", "protonation"), "C")]).complete).toBe(false);
  });
});

describe("version diff", () => {
  it("lists only changed fields", () => {
    const edited: LessonSnapshot = structuredClone(s);
    edited.misconceptions["aadc-is-rate-limiting"].remediation = "Edited remediation.";
    edited.title = "Dopamine";
    const changes = diffSnapshots(s, edited);
    expect(changes.map((c) => c.path)).toEqual(["Title", "Misconception aadc-is-rate-limiting remediation"]);
    expect(changes[1]).toMatchObject({ after: "Edited remediation." });
  });

  it("treats every field as new on a first version", () => {
    expect(diffSnapshots(null, s).every((c) => c.before === null)).toBe(true);
  });
});

describe("draft previews", () => {
  it("are hidden in production builds except to admins", () => {
    expect(previewAllowed(false, { NODE_ENV: "production" })).toBe(false);
    expect(previewAllowed(false, { NODE_ENV: "production", VERCEL_ENV: "production" })).toBe(false);
    expect(previewAllowed(true, { NODE_ENV: "production", VERCEL_ENV: "production" })).toBe(true);
    // Vercel preview deployments need an explicit opt-in.
    expect(previewAllowed(false, { NODE_ENV: "production", VERCEL_ENV: "preview" })).toBe(false);
    expect(previewAllowed(false, { NODE_ENV: "production", VERCEL_ENV: "preview", LESSON_PREVIEW: "on" })).toBe(true);
    expect(previewAllowed(false, { NODE_ENV: "production", VERCEL_ENV: "production", LESSON_PREVIEW: "on" })).toBe(false);
    expect(previewAllowed(false, { NODE_ENV: "development" })).toBe(true);
  });
});

describe("funnel", () => {
  it("suppresses daily counts under five", () => {
    const day = funnelDay(new Date("2026-10-29T23:59:00Z"));
    expect(day.toISOString()).toBe("2026-10-29T00:00:00.000Z");
    expect(suppressSmall([{ day, event: "lesson_started", count: 4 }, { day, event: "lesson_completed", count: 5 }]).map((r) => r.count)).toEqual([null, 5]);
  });
});
