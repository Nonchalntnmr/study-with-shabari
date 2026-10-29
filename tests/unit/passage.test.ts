import { describe, expect, it } from "vitest";
import { normalizeRanges, segmentParagraph, splitParagraphs, subtractRange } from "@/lib/exam/passage";

describe("splitParagraphs", () => {
  it("splits on blank lines and trims", () => {
    expect(splitParagraphs("One.\n\n  Two.  \r\n\r\nThree.\n")).toEqual(["One.", "Two.", "Three."]);
  });
});

describe("normalizeRanges", () => {
  const lengths = [10, 20];
  it("drops out-of-bounds and empty ranges", () => {
    expect(
      normalizeRanges(
        [
          { p: 0, s: 2, e: 2 },
          { p: 0, s: 5, e: 11 },
          { p: 2, s: 0, e: 1 },
          { p: -1, s: 0, e: 1 },
          { p: 1, s: 0, e: 4 },
        ],
        lengths,
      ),
    ).toEqual([{ p: 1, s: 0, e: 4 }]);
  });
  it("merges overlapping and touching ranges within a paragraph only", () => {
    expect(
      normalizeRanges(
        [
          { p: 0, s: 4, e: 8 },
          { p: 0, s: 0, e: 4 },
          { p: 1, s: 3, e: 5 },
          { p: 0, s: 7, e: 9 },
        ],
        lengths,
      ),
    ).toEqual([
      { p: 0, s: 0, e: 9 },
      { p: 1, s: 3, e: 5 },
    ]);
  });
});

describe("subtractRange", () => {
  it("splits a highlight when clearing its middle", () => {
    expect(subtractRange([{ p: 0, s: 0, e: 10 }], { p: 0, s: 3, e: 6 })).toEqual([
      { p: 0, s: 0, e: 3 },
      { p: 0, s: 6, e: 10 },
    ]);
  });
  it("leaves other paragraphs alone", () => {
    expect(subtractRange([{ p: 1, s: 0, e: 4 }], { p: 0, s: 0, e: 4 })).toEqual([{ p: 1, s: 0, e: 4 }]);
  });
});

describe("segmentParagraph", () => {
  it("reconstructs the original text exactly", () => {
    const text = "The quick brown fox";
    const segs = segmentParagraph(text, [{ p: 0, s: 4, e: 9 }, { p: 1, s: 0, e: 2 }], 0);
    expect(segs.map((s) => s.text).join("")).toBe(text);
    expect(segs.filter((s) => s.highlighted).map((s) => s.text)).toEqual(["quick"]);
    expect(segs.map((s) => s.start)).toEqual([0, 4, 9]);
  });
});
