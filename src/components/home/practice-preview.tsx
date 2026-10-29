"use client";

import { Eraser, Highlighter } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ChoiceList } from "@/components/exam/choice-list";
import { PassagePane, selectionToRanges } from "@/components/exam/passage-pane";
import { normalizeRanges, subtractRange, type HighlightRange } from "@/lib/exam/passage";
import type { RunnerPassage, RunnerResponse } from "@/lib/exam/types";

export type PreviewQuestion = {
  setTitle: string;
  setSlug: string;
  number: number;
  of: number;
  stem: string;
  choices: { id: string; label: string; text: string; correct: boolean; rationale: string }[];
  explanation: string;
};

/** A real question from the sample bank, in the real exam components. Nothing is saved. */
export function PracticePreview({ passage, question }: { passage: RunnerPassage; question: PreviewQuestion }) {
  const [response, setResponse] = useState<RunnerResponse>({ selectedChoiceId: null, eliminatedChoiceIds: [], flagged: false, timeSpentMs: 0 });
  const [submitted, setSubmitted] = useState(false);
  const [highlights, setHighlights] = useState<HighlightRange[]>([]);
  const passageRef = useRef<HTMLDivElement>(null);
  const chosen = question.choices.find((c) => c.id === response.selectedChoiceId);

  const edit = (mode: "add" | "remove") => {
    const picked = selectionToRanges(passageRef.current);
    if (!picked.length) return;
    const lengths = passage.paragraphs.map((p) => p.length);
    setHighlights((h) => (mode === "add" ? normalizeRanges([...h, ...picked], lengths) : picked.reduce(subtractRange, h)));
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div className="exam-surface overflow-hidden rounded-[22px] border border-hairline bg-white shadow-[0_30px_80px_-40px_rgba(46,37,96,0.35)]">
      <div className="flex items-center justify-between gap-3 bg-navy px-5 py-3 text-sm text-white">
        <p className="font-medium">{question.setTitle}</p>
        <p className="text-white/75">
          Question {question.number} of {question.of}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1 border-b bg-sky px-3 py-1.5 text-sm text-navy">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => edit("add")} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-white/70">
          <Highlighter className="size-4" aria-hidden /> Highlight
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => edit("remove")} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-white/70">
          <Eraser className="size-4" aria-hidden /> Remove highlight
        </button>
        <span className="ml-auto px-2 text-xs text-navy/70">Select passage text, then Highlight. Right-click a choice to strike it out.</span>
      </div>
      <div className="grid md:grid-cols-2">
        <section aria-label="Passage" tabIndex={0} className="max-h-[560px] overflow-y-auto border-b px-6 py-6 md:border-b-0 md:border-r md:px-8">
          <PassagePane ref={passageRef} passage={passage} highlights={highlights} />
        </section>
        <section aria-label={`Question ${question.number}`} className="px-6 py-6 md:px-8">
          <h3 className="whitespace-pre-line font-reading text-lg font-normal leading-relaxed text-ink">{question.stem}</h3>
          <ChoiceList
            questionId="preview"
            choices={question.choices}
            response={response}
            onSelect={(id) => !submitted && setResponse((r) => ({ ...r, selectedChoiceId: id, eliminatedChoiceIds: r.eliminatedChoiceIds.filter((c) => c !== id) }))}
            onToggleStrike={(id) =>
              !submitted &&
              setResponse((r) => ({
                ...r,
                eliminatedChoiceIds: r.eliminatedChoiceIds.includes(id) ? r.eliminatedChoiceIds.filter((c) => c !== id) : [...r.eliminatedChoiceIds, id],
                selectedChoiceId: r.selectedChoiceId === id ? null : r.selectedChoiceId,
              }))
            }
          />
          {!submitted ? (
            <button
              type="button"
              disabled={!chosen}
              onClick={() => setSubmitted(true)}
              className="mt-6 h-11 rounded-full bg-navy px-6 text-sm font-semibold text-white disabled:opacity-40"
            >
              Check my answer
            </button>
          ) : (
            <div role="status" className="mt-6 space-y-3 rounded-xl bg-sky p-5 text-sm leading-relaxed text-ink">
              <p className="font-semibold">
                {chosen?.correct ? `Correct: ${chosen.label}.` : `Not quite. You chose ${chosen?.label}; the answer is ${question.choices.find((c) => c.correct)?.label}.`}
              </p>
              {chosen && <p>{chosen.rationale}</p>}
              <p>{question.explanation}</p>
              <div className="flex flex-wrap gap-4 pt-1">
                <Link href={`/practice/${question.setSlug}`} className="font-semibold text-navy underline underline-offset-4">
                  Take the full set
                </Link>
                <button
                  type="button"
                  className="text-navy/80 underline underline-offset-4"
                  onClick={() => {
                    setSubmitted(false);
                    setResponse({ selectedChoiceId: null, eliminatedChoiceIds: [], flagged: false, timeSpentMs: 0 });
                  }}
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
