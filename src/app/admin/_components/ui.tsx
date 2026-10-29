import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "warn" | "good" }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-3xl font-semibold tabular-nums", tone === "warn" && "text-danger", tone === "good" && "text-success")}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PUBLISHED: "default",
  REVIEW: "secondary",
  DRAFT: "outline",
  ARCHIVED: "outline",
  NEW: "default",
  IN_PROGRESS: "secondary",
  RESOLVED: "outline",
  SPAM: "destructive",
  SENT: "outline",
  FAILED: "destructive",
  NOT_CONFIGURED: "secondary",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? "outline"}>{status.replace("_", " ").toLowerCase()}</Badge>;
}

export const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</p>;
}
