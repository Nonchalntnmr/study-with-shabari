import { requireAdmin } from "@/lib/auth/dal";
import { Section } from "../_components/fields";
import { PageHeader } from "../_components/ui";
import { ImportForm } from "./import-form";

// Admin content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;

export default async function ImportPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        title="Import questions"
        description="Bulk-add exams, passages and questions from a JSON file. Validate first: nothing is written until you press Import."
      />
      <Section
        title="Content file"
        description={
          <>
            Format: see <code className="font-mono">docs/CONTENT_FORMAT.md</code> in the repository, or{" "}
            <code className="font-mono">content/samples/sample-bank.json</code> for a complete example. Imported content lands as a draft or in review,
            never published directly. Re-importing the same ids updates them in place. Files that would change published content are refused. Max 2 MB.
          </>
        }
      >
        <ImportForm />
      </Section>
    </>
  );
}
