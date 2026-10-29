import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { PageHeader } from "../../_components/ui";
import { PassageEditor } from "../passage-editor";

// Admin content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;

export default async function NewPassagePage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="New passage" description="Saved as a draft. Add figures and questions after creating it." actions={<Link href="/admin/content?tab=passages" className="text-sm text-blue hover:underline">All passages</Link>} />
      <PassageEditor passage={null} />
    </>
  );
}
