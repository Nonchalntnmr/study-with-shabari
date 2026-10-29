import { Button } from "@/components/ui/button";
import { saveTopic } from "@/lib/admin/editor-actions";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ActionForm } from "../_components/action-form";
import { SECTIONS, Section, SectionSelect, inputClass } from "../_components/fields";
import { PageHeader } from "../_components/ui";

// Admin content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;

export default async function TopicsPage() {
  await requireAdmin();
  const topics = await db.topic.findMany({ orderBy: [{ section: "asc" }, { name: "asc" }], include: { _count: { select: { questions: true } } } });
  return (
    <>
      <PageHeader title="Topics" description="Topics drive the per-topic breakdown students see. Slugs can’t change after creation because content imports refer to them." />
      <div className="space-y-6">
        <Section title="New topic">
          <ActionForm action={saveTopic} className="items-end">
            <div className="space-y-1">
              <label htmlFor="new-name" className="text-sm font-medium">Name</label>
              <input id="new-name" name="name" required maxLength={120} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label htmlFor="new-slug" className="text-sm font-medium">Slug</label>
              <input id="new-slug" name="slug" required placeholder="cp-thermodynamics" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label htmlFor="new-section" className="text-sm font-medium">Section</label>
              <SectionSelect id="new-section" />
            </div>
            <Button type="submit">Create topic</Button>
          </ActionForm>
        </Section>
        {SECTIONS.map((s) => {
          const rows = topics.filter((t) => t.section === s.value);
          if (rows.length === 0) return null;
          return (
            <Section key={s.value} title={s.label}>
              <ul className="space-y-2">
                {rows.map((t) => (
                  <li key={t.id}>
                    <ActionForm action={saveTopic}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="slug" value={t.slug} />
                      <input type="hidden" name="section" value={t.section} />
                      <label htmlFor={`t-${t.id}`} className="sr-only">Name for {t.slug}</label>
                      <input id={`t-${t.id}`} name="name" defaultValue={t.name} required maxLength={120} className={`${inputClass} max-w-sm`} />
                      <span className="font-mono text-xs text-muted-foreground">{t.slug}</span>
                      <span className="text-xs text-muted-foreground">{t._count.questions} questions</span>
                      <Button type="submit" size="sm" variant="outline">Rename</Button>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </Section>
          );
        })}
      </div>
    </>
  );
}
