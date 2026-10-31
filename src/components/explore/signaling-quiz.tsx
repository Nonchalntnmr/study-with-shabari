"use client";

import { useState, useTransition } from "react";
import { checkSignalingAnswer } from "@/lib/explore/signaling-actions";
import { LESSON } from "@/lib/explore/signaling-copy";
import type { AnswerResult, PublicQuestion } from "@/lib/explore/signaling-questions";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"] as const;

export function SignalingQuiz({ questions }: { questions: PublicQuestion[] }) {
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, Extract<AnswerResult, { answer: number }>>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function submit(id: string) {
    const choice = picked[id];
    if (choice === undefined) return;
    setPendingId(id);
    startTransition(async () => {
      const res = await checkSignalingAnswer(id, choice);
      setPendingId(null);
      if ("answer" in res) {
        setResults((prev) => ({ ...prev, [id]: res }));
      }
    });
  }

  const answeredCount = Object.keys(results).length;
  const correctCount = Object.values(results).filter((r) => r.correct).length;

  return (
    <div className="space-y-8" data-explorer="quiz">
      <p className="text-[1.05rem] text-quiet">{LESSON.pick}</p>
      <div className="grid gap-8">
        {questions.map((q, idx) => {
          const sel = picked[q.id];
          const res = results[q.id];
          return (
            <article key={q.id} data-question={q.id} className="rounded-2xl border border-hairline bg-white p-6 sm:p-8">
              <p className="text-[0.85rem] font-semibold uppercase tracking-[0.12em] text-quiet">Question {idx + 1} of {questions.length}</p>
              <h3 className="mt-2 font-display text-[1.45rem] leading-snug text-hema">{q.stem}</h3>
              <div role="radiogroup" aria-label={`Question ${idx + 1}`} className="mt-5 grid gap-2.5">
                {q.choices.map((c, i) => {
                  const chosen = sel === i;
                  const isAnswer = res && res.answer === i;
                  const wrongPick = res && chosen && !res.correct;
                  return (
                    <label
                      key={i}
                      className={cn(
                        "flex cursor-pointer items-baseline gap-3 rounded-xl border px-4 py-3 text-[1.02rem] transition-colors",
                        isAnswer
                          ? "border-[#0B6E6A] bg-[#F1FAF9] text-hema"
                          : wrongPick
                            ? "border-[#B91C1C] bg-[#FEF2F2] text-hema"
                            : chosen
                              ? "border-eosin bg-[#EEF4FF] text-hema"
                              : "border-hairline bg-white text-specimen hover:border-hema/35",
                      )}
                    >
                      <input
                        type="radio"
                        name={`sig-q-${q.id}`}
                        value={i}
                        checked={chosen}
                        onChange={() => setPicked((prev) => ({ ...prev, [q.id]: i }))}
                        className="sr-only"
                      />
                      <span className="font-semibold text-hema">{LETTERS[i]}.</span>
                      <span>{c}</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  disabled={sel === undefined || pendingId === q.id}
                  onClick={() => submit(q.id)}
                  className="sig-button-primary"
                >
                  Check answer
                </button>
              </div>
              {res && (
                <div
                  role="status"
                  aria-live="polite"
                  data-testid={`reveal-${q.id}`}
                  className="mt-5 rounded-xl border border-hairline bg-mist px-4 py-3.5 text-[1.02rem] leading-relaxed text-specimen"
                >
                  <p className="font-semibold text-hema">
                    {res.correct ? "Correct." : `Not quite. The answer is ${LETTERS[res.answer]}.`}{" "}
                    <span className="font-normal">{res.explanation}</span>
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {answeredCount === questions.length && (
        <p data-testid="quiz-summary" className="rounded-xl border border-hairline bg-mist px-5 py-4 text-[1.05rem] font-semibold text-hema">
          {correctCount} of {questions.length} right.
        </p>
      )}
    </div>
  );
}
