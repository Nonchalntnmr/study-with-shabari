import { Flag, Highlighter, Timer } from "lucide-react";

/** Decorative picture of the practice interface. The real thing lives at /practice. */
export function ExamPreview() {
  return (
    <div aria-hidden className="overflow-hidden rounded-2xl border bg-white shadow-[0_24px_60px_-28px_rgba(16,37,75,0.45)]">
      <div className="flex items-center justify-between bg-navy px-4 py-2.5 text-xs text-white">
        <span className="font-medium">Chem/Phys sample set 1</span>
        <span className="flex items-center gap-1.5 tabular-nums">
          <Timer className="size-3.5" /> 11:42
        </span>
      </div>
      <div className="flex items-center gap-4 border-b bg-sky px-4 py-2 text-xs text-navy">
        <span className="flex items-center gap-1.5">
          <Highlighter className="size-3.5" /> Highlight
        </span>
        <span className="line-through decoration-navy/70">Strikethrough</span>
        <span className="ml-auto flex items-center gap-1.5 font-medium">
          <Flag className="size-3.5 fill-mark text-navy" /> Flagged
        </span>
      </div>
      <div className="grid gap-0 font-reading text-[0.82rem] leading-relaxed sm:grid-cols-2">
        <div className="border-b p-4 sm:border-b-0 sm:border-r">
          <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">Passage</p>
          <p>
            Blood plasma is held near pH 7.4 largely by the{" "}
            <mark className="exam-hl">carbonic acid–bicarbonate buffer</mark>. The apparent pKa of this combined equilibrium at body
            temperature is <mark className="exam-hl">6.1</mark>…
          </p>
        </div>
        <div className="p-4">
          <p className="mb-2 font-semibold text-ink">2. During a panic attack, a patient hyperventilates and pCO₂ falls to 20 mmHg…</p>
          <ul className="space-y-1.5">
            <li className="rounded-md border px-2.5 py-1.5 text-muted-foreground line-through">A. pH falls, respiratory acidosis</li>
            <li className="rounded-md border px-2.5 py-1.5 text-muted-foreground line-through">B. pH falls, metabolic acidosis</li>
            <li className="rounded-md border-2 border-blue bg-sky px-2.5 py-1.5 font-medium text-navy">C. pH rises, respiratory alkalosis</li>
            <li className="rounded-md border px-2.5 py-1.5">D. pH rises, metabolic alkalosis</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
