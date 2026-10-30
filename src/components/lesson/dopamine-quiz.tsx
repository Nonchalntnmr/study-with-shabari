"use client";

import { useState, useTransition } from "react";
import { checkDopamineAnswer } from "@/lib/lessons/dopamine-actions";
import { cn } from "@/lib/utils";

type Question = { id: string; stem: string; choices: string[] };
type Result = { picked: number; correct: boolean; answer: number; explanation: string };

const LETTERS = ["A", "B", "C", "D"];

/** One practice question: pick an answer, then see whether it was right and why. */
function QuizQuestion({ q, n }: { q: Question; n: number }) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pick(choice: number) {
    if (result || pending) return;
    start(async () => {
      const r = await checkDopamineAnswer(q.id, choice);
      if ("error" in r) setError(r.error);
      else setResult({ picked: choice, ...r });
    });
  }

  return (
    <li className="border-t border-hairline pt-8">
      <fieldset>
        <legend className="text-[1.1875rem] leading-relaxed text-specimen">
          <span className="font-semibold text-hema">Q{n}.</span> {q.stem}
        </legend>
        <div className="mt-5 grid gap-2.5">
          {q.choices.map((c, i) => {
            const isAnswer = result?.answer === i;
            const isWrongPick = result && result.picked === i && !result.correct;
            return (
              <button
                key={c}
                type="button"
                onClick={() => pick(i)}
                disabled={!!result || pending}
                aria-pressed={result?.picked === i}
                className={cn(
                  "flex min-h-12 items-baseline gap-3 rounded-xl border px-4 py-3 text-left text-[1.0625rem] transition-colors",
                  !result && "border-hairline bg-white hover:border-hema/50",
                  isAnswer && "border-success bg-success-soft",
                  isWrongPick && "border-eosin/60 bg-white",
                  result && !isAnswer && !isWrongPick && "border-hairline bg-white opacity-70",
                )}
              >
                <span className="font-semibold text-hema">{LETTERS[i]})</span>
                <span>{c}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <div role="status" aria-live="polite" className="mt-4">
        {result && (
          <p className="text-[1.0625rem] leading-relaxed text-specimen/90">
            <span className={cn("font-semibold", result.correct ? "text-success" : "text-eosin-ink")}>
              {result.correct ? "Correct." : `Not quite. The answer is ${LETTERS[result.answer]}.`}
            </span>{" "}
            {result.explanation}
          </p>
        )}
        {error && <p className="text-[1rem] text-eosin-ink">{error}</p>}
      </div>
    </li>
  );
}

export function DopamineQuiz({ questions }: { questions: Question[] }) {
  return (
    <ol className="mt-10 grid gap-10">
      {questions.map((q, i) => (
        <QuizQuestion key={q.id} q={q} n={i + 1} />
      ))}
    </ol>
  );
}
