import { AI_NOTE, DRAFT_BADGE, PREVIEW_NOTE } from "@/lib/lessons/preview";

export function DraftBadge({ note = false }: { note?: boolean }) {
  return (
    <div className="space-y-2">
      <p data-testid="draft-badge" className="inline-flex items-center gap-2 rounded-full bg-[#FBEFC7] px-3 py-1 text-sm font-medium text-[#5C4400] ring-1 ring-[#D9B44A]">
        <span aria-hidden className="size-1.5 rounded-full bg-[#8A6A00]" />
        {DRAFT_BADGE}
      </p>
      {note && <p className="text-sm text-quiet">{PREVIEW_NOTE}</p>}
    </div>
  );
}

/** Attribution for approved AI-assisted lessons. Never says the explanations are Shabari's. */
export function AiNote({ className }: { className?: string }) {
  return <p className={`text-sm text-quiet ${className ?? ""}`}>{AI_NOTE}</p>;
}
