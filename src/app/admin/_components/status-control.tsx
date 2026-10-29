import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/admin/actions";
import { ActionForm } from "./action-form";
import { StatusBadge, selectClass } from "./ui";

const STATUSES = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] as const;

/** Publishing workflow control for an editor page; the action enforces the publish rules. */
export function StatusControl({
  id,
  status,
  action,
}: {
  id: string;
  status: string;
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge status={status} />
      <ActionForm action={action}>
        <input type="hidden" name="id" value={id} />
        <label className="sr-only" htmlFor={`status-${id}`}>
          Status
        </label>
        <select id={`status-${id}`} name="status" defaultValue={status} className={selectClass}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.toLowerCase()}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline">
          Set status
        </Button>
      </ActionForm>
    </div>
  );
}
