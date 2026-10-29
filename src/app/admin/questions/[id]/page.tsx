import Link from "next/link";
import { notFound } from "next/navigation";
import { setQuestionStatus } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { Banner, Section } from "../../_components/fields";
import { StatusControl } from "../../_components/status-control";
import { PageHeader } from "../../_components/ui";
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

  return (
    <>
      <PageHeader
        title="Edit question"
        description={q.externalId ? `Imported id: ${q.externalId}` : undefined}
        actions={<Link href="/admin/content?tab=questions" className="text-sm text-blue hover:underline">All questions</Link>}
      />
      {created && <Banner>Created as a draft.</Banner>}
      <div className="space-y-6">
        <Section title="Publishing" description="Publishing checks for four choices, exactly one correct answer, an explanation and a published passage.">
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
