import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setPassageStatus } from "@/lib/admin/actions";
import { addPassageFigure, removePassageFigure } from "@/lib/admin/editor-actions";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { assetUrl } from "@/lib/storage";
import { ActionForm } from "../../_components/action-form";
import { EditorForm } from "../../_components/editor-form";
import { Banner, Field, Section, inputClass } from "../../_components/fields";
import { StatusControl } from "../../_components/status-control";
import { PageHeader, StatusBadge } from "../../_components/ui";
import { PassageEditor } from "../passage-editor";

// Admin content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;

export default async function EditPassagePage({ params, searchParams }: PageProps<"/admin/passages/[id]">) {
  await requireAdmin();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const passage = await db.passage.findUnique({
    where: { id },
    include: {
      figures: { include: { asset: true }, orderBy: { position: "asc" } },
      questions: { select: { id: true, stem: true, status: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!passage) notFound();
  const questionIds = passage.questions.map((q) => q.id);
  const attempts = questionIds.length ? await db.attempt.count({ where: { questionOrder: { hasSome: questionIds } } }) : 0;

  return (
    <>
      <PageHeader title="Edit passage" description={passage.externalId ? `Imported id: ${passage.externalId}` : undefined} actions={<Link href="/admin/content?tab=passages" className="text-sm text-blue hover:underline">All passages</Link>} />
      {created && <Banner>Created as a draft.</Banner>}
      {attempts > 0 && (
        <p role="note" className="mb-4 rounded-lg border border-mark bg-warning-soft px-3 py-2 text-sm">
          {attempts} attempt{attempts === 1 ? "" : "s"} already include questions on this passage. Students’ highlights point at character positions, so
          rewording a paragraph can shift highlights in past results. Fix typos freely; for bigger changes, consider a new passage.
        </p>
      )}
      <div className="space-y-6">
        <Section title="Publishing" description="Publish the passage before publishing its questions.">
          <StatusControl id={passage.id} status={passage.status} action={setPassageStatus} />
        </Section>
        <PassageEditor passage={passage} />
        <Section title="Figures" description="Shown below the passage text, in this order.">
          {passage.figures.length > 0 && (
            <ul className="mb-4 space-y-3">
              {passage.figures.map((f) => (
                <li key={f.id} className="flex flex-wrap items-start gap-4 rounded-lg border p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded diagram */}
                  <img src={assetUrl(f.asset)} alt={f.asset.alt} className="max-h-32 rounded border" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p>Alt: {f.asset.alt}</p>
                    {f.caption && <p className="text-muted-foreground">Caption: {f.caption}</p>}
                  </div>
                  <ActionForm action={removePassageFigure}>
                    <input type="hidden" name="figureId" value={f.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Remove
                    </Button>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
          <EditorForm action={addPassageFigure} className="space-y-3">
            <input type="hidden" name="passageId" value={passage.id} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Image" htmlFor="p-fig-file">
                <input id="p-fig-file" name="figure" type="file" accept="image/png,image/jpeg,image/gif,image/webp" required className="text-sm" />
              </Field>
              <Field label="Alt text" htmlFor="p-fig-alt">
                <input id="p-fig-alt" name="alt" required maxLength={300} className={inputClass} />
              </Field>
              <Field label="Caption (optional)" htmlFor="p-fig-caption">
                <input id="p-fig-caption" name="caption" maxLength={300} className={inputClass} />
              </Field>
            </div>
            <Button type="submit" variant="outline" size="sm">
              Upload figure
            </Button>
          </EditorForm>
        </Section>
        <Section title="Questions on this passage">
          {passage.questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <ul className="space-y-2">
              {passage.questions.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/admin/questions/${q.id}`} className="truncate text-blue hover:underline">
                    {q.stem}
                  </Link>
                  <StatusBadge status={q.status} />
                </li>
              ))}
            </ul>
          )}
          <Button asChild size="sm" variant="outline" className="mt-4">
            <Link href={`/admin/questions/new?passage=${passage.id}&section=${passage.section}`}>Add a question to this passage</Link>
          </Button>
        </Section>
      </div>
    </>
  );
}
