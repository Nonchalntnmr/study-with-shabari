import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { PageHeader } from "../../_components/ui";
import { QuestionEditor } from "../question-editor";

// Admin content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;

export default async function NewQuestionPage({ searchParams }: PageProps<"/admin/questions/new">) {
  await requireAdmin();
  const { passage, section } = await searchParams;
  return (
    <>
      <PageHeader title="New question" description="Saved as a draft. Publish it from its page once it’s complete." actions={<Link href="/admin/content?tab=questions" className="text-sm text-blue hover:underline">All questions</Link>} />
      <QuestionEditor question={null} defaultPassageId={typeof passage === "string" ? passage : undefined} defaultSection={typeof section === "string" ? section : undefined} />
    </>
  );
}
