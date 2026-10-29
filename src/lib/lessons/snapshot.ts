import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { LessonForCheck } from "@/lib/admin/rules";

// A LessonVersion's frozen copy of everything a student sees and is graded
// against. Kept free of "server-only" so scripts can publish.

export type SnapshotChoice = { label: string; text: string; isCorrect: boolean; rationale: string | null; misconception: string | null };
export type SnapshotQuestion = {
  id: string;
  externalId: string | null;
  section: string;
  stem: string;
  explanation: string;
  authoredBy: "HUMAN" | "AI";
  reviewedById: string | null;
  passage: { id: string; title: string; body: string; source: string | null } | null;
  choices: SnapshotChoice[];
};
export type SnapshotMisconception = { id: string; slug: string; name: string; description: string; remediation: string; authoredBy: "HUMAN" | "AI" };
export type SnapshotStep = {
  position: number;
  kind: "TEACH" | "TEST" | "REMEDIATE" | "RETEST";
  concept: string;
  title: string | null;
  body: string | null;
  figure: string | null;
  question: SnapshotQuestion | null;
};
export type LessonSnapshot = {
  schema: 1;
  lessonId: string;
  slug: string;
  title: string;
  section: string | null;
  summary: string;
  objectives: string[];
  authoredBy: "HUMAN" | "AI";
  steps: SnapshotStep[];
  misconceptions: Record<string, SnapshotMisconception>;
};

/** Reads the current draft of a lesson into snapshot form. */
export async function buildSnapshot(db: PrismaClient | Prisma.TransactionClient, lessonId: string): Promise<LessonSnapshot | null> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      steps: {
        orderBy: { position: "asc" },
        include: { question: { include: { passage: true, choices: { orderBy: { label: "asc" }, include: { misconception: true } } } } },
      },
    },
  });
  if (!lesson) return null;

  const misconceptions: Record<string, SnapshotMisconception> = {};
  const steps: SnapshotStep[] = lesson.steps.map((s) => {
    const q = s.question;
    for (const c of q?.choices ?? []) {
      const m = c.misconception;
      if (m) misconceptions[m.slug] = { id: m.id, slug: m.slug, name: m.name, description: m.description, remediation: m.remediation, authoredBy: m.authoredBy };
    }
    return {
      position: s.position,
      kind: s.kind,
      concept: s.concept,
      title: s.title,
      body: s.body,
      figure: s.figure,
      question: q
        ? {
            id: q.id,
            externalId: q.externalId,
            section: q.section,
            stem: q.stem,
            explanation: q.explanation,
            authoredBy: q.authoredBy,
            reviewedById: q.reviewedById,
            passage: q.passage ? { id: q.passage.id, title: q.passage.title, body: q.passage.body, source: q.passage.source } : null,
            choices: q.choices.map((c) => ({ label: c.label, text: c.text, isCorrect: c.isCorrect, rationale: c.rationale, misconception: c.misconception?.slug ?? null })),
          }
        : null,
    };
  });

  return {
    schema: 1,
    lessonId: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    section: lesson.section,
    summary: lesson.summary,
    objectives: lesson.objectives,
    authoredBy: lesson.authoredBy,
    steps,
    misconceptions,
  };
}

/** True when any part of the lesson was drafted by AI. */
export function containsAi(s: LessonSnapshot): boolean {
  return (
    s.authoredBy === "AI" ||
    s.steps.some((st) => st.question?.authoredBy === "AI") ||
    Object.values(s.misconceptions).some((m) => m.authoredBy === "AI")
  );
}

export function forCheck(s: LessonSnapshot): LessonForCheck {
  return {
    title: s.title,
    objectives: s.objectives,
    steps: s.steps.map((st) => ({
      position: st.position,
      kind: st.kind,
      concept: st.concept,
      body: st.body,
      questionId: st.question?.id ?? null,
      question: st.question
        ? {
            stem: st.question.stem,
            explanation: st.question.explanation,
            passageId: st.question.passage?.id ?? null,
            authoredBy: st.question.authoredBy,
            reviewedById: st.question.reviewedById,
            choices: st.question.choices.map((c) => ({ label: c.label, text: c.text, isCorrect: c.isCorrect, misconceptionId: c.misconception })),
          }
        : null,
    })),
  };
}

// ------------------------------------------------------------------ diff

export type SnapshotChange = { path: string; before: string | null; after: string | null };

/** Flattens the student-visible text of a snapshot into labelled fields. */
function fields(s: LessonSnapshot): Map<string, string> {
  const out = new Map<string, string>();
  out.set("Title", s.title);
  out.set("Summary", s.summary);
  s.objectives.forEach((o, i) => out.set(`Objective ${i + 1}`, o));
  for (const st of s.steps) {
    const at = `Step ${st.position + 1}`;
    out.set(`${at} kind`, `${st.kind} (${st.concept})`);
    if (st.title) out.set(`${at} title`, st.title);
    if (st.body) out.set(`${at} text`, st.body);
    const q = st.question;
    if (!q) continue;
    if (q.passage) out.set(`${at} passage`, `${q.passage.title}\n\n${q.passage.body}`);
    out.set(`${at} question`, q.stem);
    out.set(`${at} explanation`, q.explanation);
    for (const c of q.choices) {
      out.set(`${at} choice ${c.label}`, `${c.text}${c.isCorrect ? " (correct)" : ""}`);
      if (c.rationale) out.set(`${at} choice ${c.label} rationale`, c.rationale);
      if (c.misconception) out.set(`${at} choice ${c.label} misconception`, c.misconception);
    }
  }
  for (const m of Object.values(s.misconceptions).sort((a, b) => a.slug.localeCompare(b.slug))) {
    out.set(`Misconception ${m.slug} name`, m.name);
    out.set(`Misconception ${m.slug} description`, m.description);
    out.set(`Misconception ${m.slug} remediation`, m.remediation);
  }
  return out;
}

/** Field-level changes from `before` to `after`, in the order fields appear. `before` null means a first version. */
export function diffSnapshots(before: LessonSnapshot | null, after: LessonSnapshot): SnapshotChange[] {
  const a = before ? fields(before) : new Map<string, string>();
  const b = fields(after);
  const changes: SnapshotChange[] = [];
  for (const [path, value] of b) {
    const old = a.get(path) ?? null;
    if (old !== value) changes.push({ path, before: old, after: value });
  }
  for (const [path, value] of a) if (!b.has(path)) changes.push({ path, before: value, after: null });
  return changes;
}
