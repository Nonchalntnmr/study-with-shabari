import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { approveQuestion, setQuestionStatus } from "@/lib/admin/actions";
import { changedFields, type VersionSnapshot } from "@/lib/exam/versions";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { Banner, Section } from "../../_components/fields";
import { ActionForm } from "../../_components/action-form";
import { StatusControl } from "../../_components/status-control";
import { PageHeader, formatDate } from "../../_components/ui";
import { QuestionEditor } from "../question-editor";

// Admin content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;

export default async function EditQuestionPage({ params, searchParams }: PageProps<"/admin/questions/[id]">) {
  await requireAdmin();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const q = await db.question.findUnique({
    where: { id },
    include: {
      choices: { orderBy: { label: "asc" } },
      topics: { select: { topicId: true } },
      figure: true,
      passage: { select: { id: true, title: true } },
      examItems: { select: { exam: { select: { id: true, title: true, status: true } } } },
      _count: { select: { responses: true } },
    },
  });
  if (!q) notFound();
  const versions = await db.questionVersion.findMany({ where: { questionId: id }, orderBy: { version: "desc" } });
  const people = new Map(
    (await db.user.findMany({ where: { id: { in: versions.flatMap((v) => [v.createdById, v.reviewedById].filter((x): x is string => Boolean(x))) } }, select: { id: true, email: true } })).map((u) => [u.id, u.email]),
  );
  // How many attempts each version is pinned to: those results always show that version.
  const pinned = await Promise.all(versions.map((v) => db.attempt.count({ where: { questionVersionIds: { has: v.id } } })));

  return (
    <>
      <PageHeader
        title="Edit question"
        description={q.externalId ? `Imported id: ${q.externalId}` : undefined}
        actions={<Link href="/admin/content?tab=questions" className="text-sm text-blue hover:underline">All questions</Link>}
      />
      {created && <Banner>Created as a draft.</Banner>}
      <div className="space-y-6">
        <Section title="Publishing" description="Publishing checks for four choices, exactly one correct answer, a rationale for every choice, an explanation, a topic, a published passage, and a human review if AI drafted it.">
          <StatusControl id={q.id} status={q.status} action={setQuestionStatus} />
          <p className="mt-3 text-xs text-muted-foreground">
            {q._count.responses} student answer{q._count.responses === 1 ? "" : "s"} recorded.
            {q.examItems.length > 0 && (
              <>
                {" "}Used in:{" "}
                {q.examItems.map((i, n) => (
                  <span key={i.exam.id}>
                    {n > 0 && ", "}
                    <Link href={`/admin/exams/${i.exam.id}`} className="text-blue hover:underline">
                      {i.exam.title}
                    </Link>{" "}
                    ({i.exam.status.toLowerCase()})
                  </span>
                ))}
              </>
            )}
          </p>
        </Section>
        {q.authoredBy === "AI" && (
          <Section title="Human review" description="This question was drafted by AI. It can't be published until an admin has checked the question, the answer key and every rationale.">
            {q.reviewedById ? (
              <p className="text-sm text-success">Approved {formatDate(q.reviewedAt)}.</p>
            ) : (
              <ActionForm action={approveQuestion} className="grid gap-3">
                <input type="hidden" name="id" value={q.id} />
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="attest" className="mt-0.5" />
                  <span>I have checked the science, the correct answer and the rationale for every choice.</span>
                </label>
                <div>
                  <Button type="submit" size="sm">Approve</Button>
                </div>
              </ActionForm>
            )}
          </Section>
        )}
        <Section
          title="Version history"
          description="Each attempt is pinned to the version current when it started, so edits never change a result a student already has. Versions are created when the question is published, edited while published, or first served."
        >
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No versions yet: one is recorded when the question is published or first served to a student.</p>
          ) : (
            <ol className="space-y-3 text-sm" data-testid="version-history">
              {versions.map((v, i) => (
                <li key={v.id} className="rounded-lg border p-3">
                  <p>
                    <span className="font-semibold">Version {v.version}</span>, {formatDate(v.createdAt)}
                    {v.createdById ? `, by ${people.get(v.createdById) ?? "a deleted account"}` : ", captured when first served"}
                    {v.reviewedById ? `. Reviewed by ${people.get(v.reviewedById) ?? "a deleted account"}` : ". Not reviewed"}
                    {v.authoredBy === "AI" ? " (AI-drafted)" : ""}. {pinned[i]} attempt{pinned[i] === 1 ? "" : "s"}.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {changedFields((versions[i + 1]?.snapshot as unknown as VersionSnapshot | undefined) ?? null, v.snapshot as unknown as VersionSnapshot).join(", ")}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Section>
        <QuestionEditor
          question={{
            id: q.id,
            section: q.section,
            passageId: q.passageId,
            stem: q.stem,
            explanation: q.explanation,
            difficulty: q.difficulty,
            choices: q.choices,
            topicIds: q.topics.map((t) => t.topicId),
            figure: q.figure,
          }}
        />
      </div>
    </>
  );
}
