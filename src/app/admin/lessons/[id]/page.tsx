import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { approveAndPublishLesson, mapChoiceMisconception, updateLessonMeta, updateLessonStep, updateMisconception } from "@/lib/admin/lesson-actions";
import { lessonPublishProblems } from "@/lib/admin/rules";
import { db } from "@/lib/db";
import { buildSnapshot, containsAi, diffSnapshots, forCheck, type LessonSnapshot, type SnapshotChange } from "@/lib/lessons/snapshot";
import { ActionForm } from "../../_components/action-form";
import { Field, Section, inputClass, textareaClass } from "../../_components/fields";
import { PageHeader, StatusBadge, formatDate, selectClass } from "../../_components/ui";

// Signed-in content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;

function ChangeList({ changes, limit = 400 }: { changes: SnapshotChange[]; limit?: number }) {
  if (changes.length === 0) return <p className="text-sm text-muted-foreground">No differences.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" data-testid="lesson-diff">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="py-2 pr-3 font-medium">Field</th>
            <th className="py-2 pr-3 font-medium">Approved</th>
            <th className="py-2 font-medium">Draft</th>
          </tr>
        </thead>
        <tbody>
          {changes.slice(0, limit).map((c) => (
            <tr key={c.path} className="border-t align-top">
              <td className="py-2 pr-3 font-medium whitespace-nowrap">{c.path}</td>
              <td className="py-2 pr-3 whitespace-pre-line text-muted-foreground line-through decoration-danger/50">{c.before ?? "—"}</td>
              <td className="py-2 whitespace-pre-line">{c.after ?? "(removed)"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {changes.length > limit && <p className="mt-2 text-xs text-muted-foreground">{changes.length - limit} more not shown.</p>}
    </div>
  );
}

export default async function LessonDetailPage({ params }: PageProps<"/admin/lessons/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const lesson = await db.lesson.findUnique({
    where: { id },
    include: {
      publishedVersion: true,
      versions: { orderBy: { version: "desc" } },
      steps: { orderBy: { position: "asc" }, include: { question: { include: { choices: { orderBy: { label: "asc" } } } } } },
    },
  });
  if (!lesson) notFound();
  const draft = (await buildSnapshot(db, id))!;
  const published = (lesson.publishedVersion?.snapshot as unknown as LessonSnapshot | undefined) ?? null;
  const changes = diffSnapshots(published, draft);
  const ai = containsAi(draft);
  const problems = lessonPublishProblems(forCheck(draft), true);
  const misconceptions = await db.misconception.findMany({ where: { choices: { some: { question: { lessonSteps: { some: { lessonId: id } } } } } }, orderBy: { name: "asc" } });
  const allMisconceptions = await db.misconception.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const approvers = new Map((await db.user.findMany({ where: { id: { in: lesson.versions.map((v) => v.approvedById) } }, select: { id: true, email: true } })).map((u) => [u.id, u.email]));
  const versions = lesson.versions.map((v, i) => ({ v, changes: diffSnapshots((lesson.versions[i + 1]?.snapshot as unknown as LessonSnapshot | undefined) ?? null, v.snapshot as unknown as LessonSnapshot) }));

  return (
    <>
      <PageHeader
        title={lesson.title}
        description={`/lessons/${lesson.slug}. ${published ? `Students see version ${lesson.publishedVersion!.version}.` : "Not approved yet, so students can't see it."}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={lesson.status} />
            <Link href={`/lessons/${lesson.slug}`} className="text-sm text-navy underline underline-offset-4">
              Open the {published ? "published lesson" : "preview"}
            </Link>
          </div>
        }
      />

      <div className="space-y-6">
        <Section
          title="Approve and publish"
          description={
            ai
              ? "This lesson contains questions, explanations or misconceptions drafted by AI. Publishing records you as their reviewer, and students will see a note that AI drafted them. Nothing is attributed to Shabari."
              : "Publishing freezes the current draft as a new version for students."
          }
        >
          {problems.length > 0 ? (
            <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-danger">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : published && changes.length === 0 ? (
            <p className="mb-4 text-sm text-muted-foreground">The draft matches the approved version.</p>
          ) : (
            <p className="mb-4 text-sm">{published ? `${changes.length} change${changes.length === 1 ? "" : "s"} since version ${lesson.publishedVersion!.version}.` : "Ready for a first version."}</p>
          )}
          <ActionForm action={approveAndPublishLesson} className="grid gap-3">
            <input type="hidden" name="id" value={lesson.id} />
            {ai && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="attest" className="mt-0.5" />
                <span>I have read every step, question, answer rationale and misconception in this lesson and checked them for accuracy.</span>
              </label>
            )}
            {!ai && <input type="hidden" name="attest" value="on" />}
            <div>
              <Button type="submit" disabled={problems.length > 0}>
                Approve and publish
              </Button>
            </div>
          </ActionForm>
        </Section>

        <Section title={published ? `Changes since version ${lesson.publishedVersion!.version}` : "Draft content"} description={published ? undefined : "Never approved: every field below is new."}>
          {published ? <ChangeList changes={changes} /> : <p className="text-sm text-muted-foreground">{changes.length} fields across {draft.steps.length} steps.</p>}
        </Section>

        <Section title="Details">
          <ActionForm action={updateLessonMeta} className="grid gap-4">
            <input type="hidden" name="id" value={lesson.id} />
            <Field label="Title" htmlFor="title">
              <input id="title" name="title" defaultValue={lesson.title} className={inputClass} />
            </Field>
            <Field label="Summary" htmlFor="summary">
              <textarea id="summary" name="summary" defaultValue={lesson.summary} rows={2} className={textareaClass} />
            </Field>
            <Field label="Learning objectives" htmlFor="objectives" hint="One per line.">
              <textarea id="objectives" name="objectives" defaultValue={lesson.objectives.join("\n")} rows={4} className={textareaClass} />
            </Field>
            <div>
              <Button type="submit" variant="outline">
                Save details
              </Button>
            </div>
          </ActionForm>
        </Section>

        <Section title="Steps" description="Teach and remediation text is edited here. Question text is edited in the question editor; wrong answers are mapped to misconceptions here.">
          <ol className="space-y-4">
            {lesson.steps.map((st) => (
              <li key={st.id} className="rounded-lg border p-4" data-testid="lesson-step">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Step {st.position + 1}: {st.kind.toLowerCase()}, concept “{st.concept}”
                </p>
                {(st.kind === "TEACH" || st.kind === "REMEDIATE") && (
                  <ActionForm action={updateLessonStep} className="mt-3 grid gap-3">
                    <input type="hidden" name="id" value={st.id} />
                    {st.kind === "TEACH" && <input name="title" aria-label={`Step ${st.position + 1} title`} defaultValue={st.title ?? ""} className={inputClass} />}
                    <textarea name="body" aria-label={`Step ${st.position + 1} text`} defaultValue={st.body ?? ""} rows={st.kind === "TEACH" ? 6 : 3} className={textareaClass} />
                    <div>
                      <Button type="submit" variant="outline" size="sm">
                        Save step
                      </Button>
                    </div>
                  </ActionForm>
                )}
                {st.question && (
                  <div className="mt-3 space-y-3">
                    <p className="text-sm">
                      {st.question.stem}{" "}
                      <Link href={`/admin/questions/${st.question.id}`} className="text-navy underline underline-offset-4">
                        Edit question
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {st.question.authoredBy === "AI" ? "Drafted by AI. " : ""}
                      {st.question.reviewedById ? `Reviewed ${formatDate(st.question.reviewedAt)}.` : "Not reviewed yet."}
                    </p>
                    <ul className="space-y-2">
                      {st.question.choices.map((c) => (
                        <li key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="w-64 min-w-0 flex-1">
                            <span className="font-semibold">{c.label}.</span> {c.text} {c.isCorrect && <span className="text-success">(correct)</span>}
                          </span>
                          {!c.isCorrect && (
                            <ActionForm action={mapChoiceMisconception}>
                              <input type="hidden" name="choiceId" value={c.id} />
                              <select name="misconceptionId" defaultValue={c.misconceptionId ?? ""} aria-label={`Misconception for choice ${c.label}`} className={`${selectClass} max-w-72`}>
                                <option value="">No misconception</option>
                                {allMisconceptions.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                              <Button type="submit" variant="outline" size="sm">
                                Save
                              </Button>
                            </ActionForm>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Misconceptions" description="Shown to a student who picks a mapped wrong answer: the name and description in the reveal, the remediation on the next step.">
          <div className="space-y-4">
            {misconceptions.map((m) => (
              <ActionForm key={m.id} action={updateMisconception} className="grid gap-3 rounded-lg border p-4">
                <input type="hidden" name="id" value={m.id} />
                <p className="text-xs text-muted-foreground">
                  {m.slug}
                  {m.authoredBy === "AI" ? ", drafted by AI" : ""}
                </p>
                <input name="name" aria-label={`${m.slug} name`} defaultValue={m.name} className={inputClass} />
                <textarea name="description" aria-label={`${m.slug} description`} defaultValue={m.description} rows={2} className={textareaClass} />
                <textarea name="remediation" aria-label={`${m.slug} remediation`} defaultValue={m.remediation} rows={3} className={textareaClass} />
                <div>
                  <Button type="submit" variant="outline" size="sm">
                    Save misconception
                  </Button>
                </div>
              </ActionForm>
            ))}
          </div>
        </Section>

        <Section title="Versions" description="Each approval freezes an immutable copy. Students who started an older version finish it on that version.">
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved versions yet.</p>
          ) : (
            <ul className="space-y-3">
              {versions.map(({ v, changes: vc }) => (
                <li key={v.id} className="rounded-lg border p-3 text-sm">
                  <p>
                    <span className="font-semibold">Version {v.version}</span>, approved {formatDate(v.approvedAt)} by {approvers.get(v.approvedById) ?? "a deleted account"}
                    {v.id === lesson.publishedVersionId && <span className="ml-2 text-success">live</span>}
                  </p>
                  {v.version > 1 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-navy">
                        {vc.length} change{vc.length === 1 ? "" : "s"} from version {v.version - 1}
                      </summary>
                      <div className="mt-2">
                        <ChangeList changes={vc} />
                      </div>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
