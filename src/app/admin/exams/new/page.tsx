import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { PageHeader } from "../../_components/ui";
import { ExamEditor } from "../exam-editor";

// Admin content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;

export default async function NewExamPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="New exam" description="Create the exam, then add questions to it." actions={<Link href="/admin/content?tab=exams" className="text-sm text-blue hover:underline">All exams</Link>} />
      <ExamEditor exam={null} />
    </>
  );
}
