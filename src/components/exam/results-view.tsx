"use client";

import { CheckCircle2, CircleDashed, Flag, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { segmentParagraph } from "@/lib/exam/passage";
import type { AttemptResults } from "@/lib/exam/service";
import { formatClock } from "@/lib/exam/timing";
import { cn } from "@/lib/utils";

type Filter = "all" | "incorrect" | "flagged";

export function ResultsQuestions({ results }: { results: AttemptResults }) {
  const [filter, setFilter] = useState<Filter>("all");
  const items = results.items.filter((i) => (filter === "incorrect" ? !i.isCorrect : filter === "flagged" ? i.flagged : true));
  const shownPassages = new Set<string>();

  return (
    <section aria-labelledby="review-h" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="review-h" className="text-2xl font-semibold">
          Question review
        </h2>
        <div className="flex gap-2" role="group" aria-label="Filter questions">
          {(["all", "incorrect", "flagged"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} aria-pressed={filter === f} className="capitalize">
              {f === "incorrect" ? "Missed" : f}
            </Button>
          ))}
        </div>
      </div>

      {items.length === 0 && <p className="text-muted-foreground">Nothing to show for this filter.</p>}

      {items.map((item) => {
        const passage = item.passageId ? results.passages[item.passageId] : null;
        const firstForPassage = passage && !shownPassages.has(passage.id);
        if (passage) shownPassages.add(passage.id);
        const picked = item.choices.find((c) => c.id === item.selectedChoiceId);
        return (
          <div key={item.questionId} className="space-y-3">
            {passage && firstForPassage && (
              <details className="rounded-2xl border bg-muted/40 p-5">
                <summary className="cursor-pointer text-sm font-semibold">Passage: {passage.title}</summary>
                <div className="mt-4 space-y-3 font-reading text-[0.95rem] leading-relaxed">
                  {passage.paragraphs.map((text, p) => (
                    <p key={p}>
                      {segmentParagraph(text, passage.highlights, p).map((seg) =>
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
              </details>
            )}
            <article className="rounded-2xl border bg-white p-6" aria-labelledby={`q-${item.number}`} data-testid="result-item">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {item.isCorrect ? (
                  <span className="flex items-center gap-1.5 font-medium text-success">
                    <CheckCircle2 className="size-4" aria-hidden /> Correct
                  </span>
                ) : item.selectedChoiceId ? (
                  <span className="flex items-center gap-1.5 font-medium text-danger">
                    <XCircle className="size-4" aria-hidden /> Incorrect
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <CircleDashed className="size-4" aria-hidden /> Not answered
                  </span>
                )}
                <span className="text-muted-foreground">Question {item.number}</span>
                {item.flagged && (
                  <span className="flex items-center gap-1 text-navy">
                    <Flag className="size-3.5 fill-mark" aria-hidden /> Flagged
                  </span>
                )}
                <span className="ml-auto tabular-nums text-muted-foreground">{formatClock(item.timeSpentMs)} on this question</span>
              </div>
              <h3 id={`q-${item.number}`} className="mt-3 whitespace-pre-line font-reading text-lg font-normal leading-relaxed text-ink">
                {item.stem}
              </h3>
              <ul className="mt-4 space-y-2">
                {item.choices.map((c) => {
                  const mine = c.id === item.selectedChoiceId;
                  return (
                    <li
                      key={c.id}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-sm",
                        c.isCorrect && "border-success/50 bg-success-soft",
                        mine && !c.isCorrect && "border-danger/40 bg-danger-soft",
                      )}
                    >
                      <p className="font-reading">
                        <span className="font-semibold">{c.label}.</span> {c.text}
                        {c.isCorrect && <span className="ml-2 text-xs font-semibold text-success">Correct answer</span>}
                        {mine && <span className="ml-2 text-xs font-semibold text-navy">Your answer</span>}
                      </p>
                      {c.rationale && <p className="mt-1 text-muted-foreground">{c.rationale}</p>}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-5 rounded-xl bg-sky p-4 text-sm leading-relaxed">
                <p className="mb-1 font-semibold text-navy">Explanation</p>
                <p className="whitespace-pre-line">{item.explanation}</p>
              </div>
              {item.misconception && (
                <p className="mt-3 rounded-xl border bg-white px-4 py-3 text-sm" data-testid="result-misconception">
                  <span className="text-muted-foreground">The misconception behind {picked?.label}: </span>
                  <span className="font-medium">{item.misconception}</span>
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {item.topics.map((t) => t.name).join(" · ")}
                {!item.isCorrect && picked ? ` · You chose ${picked.label}` : ""}
              </p>
              {item.revised && (
                <p className="mt-1 text-xs text-muted-foreground" data-testid="result-revised">
                  This question has been revised since you answered it. You’re seeing it as you answered it, and your result is unchanged.
                </p>
              )}
            </article>
          </div>
        );
      })}
    </section>
  );
}
