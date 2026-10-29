"use client";

import { forwardRef } from "react";
import { segmentParagraph, type HighlightRange } from "@/lib/exam/passage";
import type { RunnerPassage } from "@/lib/exam/types";

/** Paragraph text is rendered verbatim, so highlight offsets map 1:1 onto textContent. */
export const PassagePane = forwardRef<HTMLDivElement, { passage: RunnerPassage; highlights: HighlightRange[] }>(function PassagePane(
  { passage, highlights },
  ref,
) {
  return (
    <article aria-label={`Passage: ${passage.title}`} className="font-reading text-[1.02rem] leading-[1.75] text-ink">
      <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wide text-muted-foreground">{passage.title}</h2>
      <div ref={ref} data-passage-text className="space-y-4">
        {passage.paragraphs.map((text, p) => (
          <p key={p} data-p={p} className="whitespace-pre-wrap">
            {segmentParagraph(text, highlights, p).map((seg) =>
              seg.highlighted ? (
                <mark key={seg.start} className="exam-hl">
                  {seg.text}
                </mark>
              ) : (
                <span key={seg.start}>{seg.text}</span>
              ),
            )}
          </p>
        ))}
      </div>
      {passage.figures.map((f) => (
        <figure key={f.id} className="mt-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded diagrams of unknown size */}
          <img src={f.url} alt={f.alt} className="max-w-full rounded border" />
          {f.caption && <figcaption className="mt-1 text-sm text-muted-foreground">{f.caption}</figcaption>}
        </figure>
      ))}
      {passage.source && <p className="mt-6 font-sans text-xs text-muted-foreground">Source: {passage.source}</p>}
    </article>
  );
});

/** Convert the current selection inside the passage into paragraph offset ranges. */
export function selectionToRanges(container: HTMLElement | null): HighlightRange[] {
  const sel = typeof window !== "undefined" ? window.getSelection() : null;
  if (!container || !sel || sel.rangeCount === 0 || sel.isCollapsed) return [];
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return [];

  const paragraphs = Array.from(container.querySelectorAll<HTMLElement>("[data-p]"));
  const out: HighlightRange[] = [];
  for (const el of paragraphs) {
    if (!range.intersectsNode(el)) continue;
    const p = Number(el.dataset.p);
    const len = el.textContent?.length ?? 0;
    const offset = (node: Node, off: number) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.setEnd(node, off);
      return r.toString().length;
    };
    const s = el.contains(range.startContainer) ? offset(range.startContainer, range.startOffset) : 0;
    const e = el.contains(range.endContainer) ? offset(range.endContainer, range.endOffset) : len;
    if (e > s) out.push({ p, s, e });
  }
  return out;
}
