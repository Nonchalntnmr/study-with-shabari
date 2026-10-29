import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";
export const textareaClass =
  "w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm leading-relaxed outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function Field({ label, htmlFor, hint, children, className }: { label: string; htmlFor: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export const SECTIONS = [
  { value: "CP", label: "Chem/Phys" },
  { value: "BB", label: "Bio/Biochem" },
  { value: "PS", label: "Psych/Soc" },
  { value: "CARS", label: "CARS" },
] as const;

export function SectionSelect({ id, defaultValue, name = "section" }: { id: string; defaultValue?: string; name?: string }) {
  return (
    <select id={id} name={name} defaultValue={defaultValue ?? "CP"} className={inputClass}>
      {SECTIONS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

export function Banner({ children }: { children: ReactNode }) {
  return <p className="mb-4 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">{children}</p>;
}
