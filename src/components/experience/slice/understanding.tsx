"use client";

import { useId, useState, useTransition } from "react";
import { checkDopamineAnswer } from "@/lib/lessons/dopamine-actions";
import { cn } from "@/lib/utils";
import { ChargeExplorer } from "./charge-explorer";

// "The moment of understanding": one of Shabari's six dopamine questions, checked on the server by
// checkDopamineAnswer (the page holds stems and choices only), an optional "how sure are you", her
// explanation, the concept to play with, a related question from her set, and what was learned.
// Right or wrong only: no score estimate of any kind.

type Q = { id: string; stem: string; choices: string[] };
type Result = { picked: number; correct: boolean; answer: number; explanation: string; confidence: Confidence | null };
type Confidence = "Sure" | "Unsure" | "Guessing";
const LETTERS = ["A", "B", "C", "D"];
const CONFIDENCE: Confidence[] = ["Sure", "Unsure", "Guessing"];

function calibration(r: Result): string | null {
  if (!r.confidence) return null;
  if (r.correct && r.confidence === "Sure") return "You were sure, and you were right.";
  if (r.correct) return `You said “${r.confidence.toLowerCase()}”, and you were right. Worth trusting that reasoning.`;
  if (r.confidence === "Sure") return "You were sure, but this one went the other way. Those are the best ones to revisit.";
  return `You said “${r.confidence.toLowerCase()}”. Now you know why.`;
}

function Question({ q, n, onResult, result }: { q: Q; n: number; onResult: (r: Result) => void; result: Result | null }) {
  const name = useId();
  const [picked, setPicked] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const check = () => {
    if (picked === null || result || pending) return;
    start(async () => {
      const r = await checkDopamineAnswer(q.id, picked);
      if ("error" in r) setError(r.error);
      else onResult({ picked, confidence, ...r });
    });
  };

  return (
    <div data-question={q.id}>
      <fieldset disabled={!!result}>
        <legend className="text-[1.25rem] leading-snug text-specimen">
          <span className="mr-2 font-semibold text-hema">Q{n}.</span>
          {q.stem}
        </legend>
        <div className="mt-5 grid gap-2.5">
          {q.choices.map((c, i) => {
            const isAnswer = result?.answer === i;
            const wrongPick = result && result.picked === i && !result.correct;
            return (
              <label
                key={c}
                className={cn(
                  "flex min-h-12 cursor-pointer items-baseline gap-3 rounded-xl border px-4 py-3 text-[1.0625rem] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-eosin",
                  !result && (picked === i ? "border-hema bg-[#F1F4FB]" : "border-[color:var(--exp-rule)] bg-white hover:border-hema/50"),
                  isAnswer && "border-success bg-success-soft",
                  wrongPick && "border-eosin/60 bg-white",
                  result && !isAnswer && !wrongPick && "border-[color:var(--exp-rule)] bg-white opacity-70",
                )}
              >
                <input type="radio" name={name} value={i} checked={picked === i} onChange={() => setPicked(i)} className="sr-only" />
                <span className="font-semibold text-hema">{LETTERS[i]})</span>
                <span>{c}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {!result && (
        <>
          <fieldset className="mt-6">
            <legend className="text-[0.98rem] font-semibold text-hema">
              How sure are you? <span className="font-normal text-[color:var(--exp-quiet)]">(optional)</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CONFIDENCE.map((c) => (
                <label
                  key={c}
                  className={cn(
                    "cursor-pointer rounded-full border px-4 py-2 text-[0.95rem] has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-eosin",
                    confidence === c ? "border-hema bg-hema text-white" : "border-[color:var(--exp-rule)] bg-white text-hema",
                  )}
                >
                  <input type="radio" name={`${name}-c`} value={c} checked={confidence === c} onChange={() => setConfidence(c)} className="sr-only" />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            onClick={check}
            disabled={picked === null || pending}
            className="mt-6 inline-flex h-12 items-center rounded-full bg-hema px-6 text-[1rem] font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {pending ? "Checking…" : "Check answer"}
          </button>
        </>
      )}

      <div role="status" aria-live="polite" className="mt-5">
        {result && (
          <div data-testid={`reveal-${q.id}`} className="rounded-xl border border-[color:var(--exp-rule)] bg-white p-5">
            <p className="text-[1.0625rem] leading-relaxed text-specimen/90">
              <span className={cn("font-semibold", result.correct ? "text-success" : "text-eosin-ink")}>
                {result.correct ? "Correct." : `Not quite. The answer is ${LETTERS[result.answer]}.`}
              </span>{" "}
              {result.explanation}
            </p>
            {calibration(result) && <p className="mt-2 text-[0.95rem] text-[color:var(--exp-quiet)]">{calibration(result)}</p>}
          </div>
        )}
        {error && <p className="text-[1rem] text-eosin-ink">{error}</p>}
      </div>
    </div>
  );
}

export function Understanding({ primary, related, lessonLine, numbers = [1, 2] }: { primary: Q; related: Q; lessonLine: string; numbers?: [number, number] }) {
  const [first, setFirst] = useState<Result | null>(null);
  const [second, setSecond] = useState<Result | null>(null);
  const [showRelated, setShowRelated] = useState(false);
  const right = [first, second].filter((r) => r?.correct).length;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
      <div>
        <Question q={primary} n={numbers[0]} result={first} onResult={setFirst} />
        {first && !showRelated && (
          <button
            type="button"
            onClick={() => setShowRelated(true)}
            className="mt-6 inline-flex h-12 items-center rounded-full border border-hema/30 bg-white px-6 text-[1rem] font-semibold text-hema hover:border-hema"
          >
            Try a related question
          </button>
        )}
        {showRelated && (
          <div className="mt-10 border-t border-[color:var(--exp-rule)] pt-8">
            <p className="exp-label-caps mb-4 text-[color:var(--exp-quiet)]">A related question from her set</p>
            <Question q={related} n={numbers[1]} result={second} onResult={setSecond} />
          </div>
        )}
      </div>

      <div className="lg:pt-1">
        {first ? (
          <ChargeExplorer />
        ) : (
          <div className="rounded-2xl border border-dashed border-[color:var(--exp-rule)] p-6 text-[1rem] text-[color:var(--exp-quiet)]">
            Answer first. Then you can move the pH and watch the amine take or lose its proton.
          </div>
        )}
        {first && second && (
          <section aria-labelledby="learned-h" data-testid="learned" className="mt-8 rounded-2xl bg-hema p-6 text-white sm:p-7">
            <h3 id="learned-h" className="text-[1.6rem] text-white">
              What you learned
            </h3>
            <ul className="mt-4 grid gap-3 text-[1.0625rem] leading-relaxed text-white/90">
              <li>{lessonLine}</li>
              <li>{first.explanation}</li>
              <li>{second.explanation}</li>
            </ul>
            <p className="mt-5 text-[0.98rem] text-white/80">
              {right} of 2 right. The other four questions are in the free lesson.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
