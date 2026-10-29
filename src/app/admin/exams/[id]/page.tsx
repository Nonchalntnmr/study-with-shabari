import { ArrowDown, ArrowUp, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setExamStatus } from "@/lib/admin/actions";
import { editExamItems } from "@/lib/admin/editor-actions";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ActionForm } from "../../_components/action-form";
import { Banner, Section, inputClass } from "../../_components/fields";
import { StatusControl } from "../../_components/status-control";
import { PageHeader, StatusBadge } from "../../_components/ui";
import { ExamEditor } from "../exam-editor";

// Admin content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;

const short = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n)}…` : s);

export default async function EditExamPage({ params, searchParams }: PageProps<"/admin/exams/[id]">) {
  await requireAdmin();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const exam = await db.exam.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { question: { select: { id: true, stem: true, status: true, passage: { select: { id: true, title: true } } } } },
      },
      _count: { select: { attempts: true } },
    },
  });
  if (!exam) notFound();
  const inExam = new Set(exam.items.map((i) => i.questionId));
  const candidates = await db.question.findMany({
    where: { section: exam.section, id: { notIn: [...inExam] }, status: { not: "ARCHIVED" } },
    orderBy: [{ passageId: "asc" }, { createdAt: "asc" }],
    select: { id: true, stem: true, status: true, passage: { select: { title: true } } },
    take: 500,
  });

  const itemButton = (questionId: string, op: "up" | "down" | "remove", label: string, icon: React.ReactNode, disabled = false) => (
    <ActionForm action={editExamItems} className="gap-0">
      <input type="hidden" name="examId" value={exam.id} />
      <input type="hidden" name="questionId" value={questionId} />
      <input type="hidden" name="op" value={op} />
      <Button type="submit" size="icon-sm" variant="ghost" aria-label={label} title={label} disabled={disabled}>
        {icon}
      </Button>
    </ActionForm>
  );

  return (
    <>
      <PageHeader title="Edit exam" description={`/practice/${exam.slug} · ${exam._count.attempts} attempt${exam._count.attempts === 1 ? "" : "s"} so far`} actions={<Link href="/admin/content?tab=exams" className="text-sm text-blue hover:underline">All exams</Link>} />
      {created && <Banner>Created as a draft. Add questions, then publish.</Banner>}
      <div className="space-y-6">
        <Section title="Publishing" description="An exam can only be published when every question in it is published. Published exams appear on the Practice page.">
          <StatusControl id={exam.id} status={exam.status} action={setExamStatus} />
        </Section>
        <ExamEditor exam={exam} />
        <Section
          title={`Questions (${exam.items.length})`}
          description="Students see them in this order. Questions from one passage stay together. Attempts already started keep the order they began with."
        >
          {exam.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No questions yet.</p>
          ) : (
            <ol className="divide-y rounded-lg border">
              {exam.items.map((item, i) => (
                <li key={item.questionId} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="w-6 tabular-nums text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/questions/${item.questionId}`} className="block truncate text-blue hover:underline">
                      {short(item.question.stem)}
                    </Link>
                    <p className="text-xs text-muted-foreground">{item.question.passage ? `Passage: ${item.question.passage.title}` : "Discrete"}</p>
                  </div>
                  <StatusBadge status={item.question.status} />
                  {itemButton(item.questionId, "up", `Move question ${i + 1} up`, <ArrowUp className="size-4" />, i === 0)}
                  {itemButton(item.questionId, "down", `Move question ${i + 1} down`, <ArrowDown className="size-4" />, i === exam.items.length - 1)}
                  {itemButton(item.questionId, "remove", `Remove question ${i + 1}`, <X className="size-4" />)}
                </li>
              ))}
            </ol>
          )}
          <ActionForm action={editExamItems} className="mt-4">
            <input type="hidden" name="examId" value={exam.id} />
            <input type="hidden" name="op" value="add" />
            <label htmlFor="add-question" className="sr-only">
              Question to add
            </label>
            <select id="add-question" name="questionId" required defaultValue="" className={`${inputClass} max-w-xl flex-1`}>
              <option value="" disabled>
                {candidates.length ? `Add a ${exam.section} question…` : `No other ${exam.section} questions yet`}
              </option>
              {candidates.map((q) => (
                <option key={q.id} value={q.id}>
                  [{q.status.toLowerCase()}] {q.passage ? `${q.passage.title}: ` : ""}
                  {short(q.stem, 70)}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm">
              Add question
            </Button>
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
