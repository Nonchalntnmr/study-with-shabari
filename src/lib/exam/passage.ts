// Pure helpers shared by the exam UI and the server. No server-only imports.

/** Passage bodies are plain text with paragraphs separated by blank lines. */
export function splitParagraphs(body: string): string[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export type HighlightRange = { p: number; s: number; e: number };

export const MAX_HIGHLIGHTS_PER_PASSAGE = 200;

/**
 * Drop out-of-bounds ranges and merge overlapping or touching ones per paragraph,
 * so stored highlights are always canonical whatever the client sent.
 */
export function normalizeRanges(ranges: HighlightRange[], paragraphLengths: number[]): HighlightRange[] {
  const valid = ranges
    .filter(
      (r) =>
        Number.isInteger(r.p) &&
        Number.isInteger(r.s) &&
        Number.isInteger(r.e) &&
        r.p >= 0 &&
        r.p < paragraphLengths.length &&
        r.s >= 0 &&
        r.e > r.s &&
        r.e <= paragraphLengths[r.p],
    )
    .sort((a, b) => a.p - b.p || a.s - b.s);

  const merged: HighlightRange[] = [];
  for (const r of valid) {
    const last = merged[merged.length - 1];
    if (last && last.p === r.p && r.s <= last.e) last.e = Math.max(last.e, r.e);
    else merged.push({ ...r });
  }
  return merged.slice(0, MAX_HIGHLIGHTS_PER_PASSAGE);
}

/** Remove [s, e) from a paragraph's highlights (used by "clear highlight"). */
export function subtractRange(ranges: HighlightRange[], cut: HighlightRange): HighlightRange[] {
  const out: HighlightRange[] = [];
  for (const r of ranges) {
    if (r.p !== cut.p || r.e <= cut.s || r.s >= cut.e) {
      out.push(r);
      continue;
    }
    if (r.s < cut.s) out.push({ p: r.p, s: r.s, e: cut.s });
    if (r.e > cut.e) out.push({ p: r.p, s: cut.e, e: r.e });
  }
  return out;
}

export type Segment = { text: string; highlighted: boolean; start: number };

/** Split one paragraph into plain and highlighted runs for rendering. */
export function segmentParagraph(text: string, ranges: HighlightRange[], p: number): Segment[] {
  const mine = ranges.filter((r) => r.p === p).sort((a, b) => a.s - b.s);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const r of mine) {
    if (r.s > cursor) segments.push({ text: text.slice(cursor, r.s), highlighted: false, start: cursor });
    segments.push({ text: text.slice(r.s, r.e), highlighted: true, start: r.s });
    cursor = r.e;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlighted: false, start: cursor });
  return segments;
}
