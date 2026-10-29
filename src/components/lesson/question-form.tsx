"use client";

import { useActionState, useRef, useState } from "react";
import { answerStep, type LessonFormState } from "@/lib/lessons/actions";

type Choice = { label: string; text: string };

const CONFIDENCE = [
  { value: "SURE", label: "Sure" },
  { value: "UNSURE", label: "Unsure" },
  { value: "GUESSING", label: "Guessing" },
] as const;

/**
 * Answer plus a confidence rating, sent together: the rating is given before
 * anything is revealed. Inputs are controlled so a validation message doesn't
 * clear what the student already picked.
 */
export function QuestionForm({
  slug,
  attemptId,
  position,
  choices,
}: {
  slug: string;
  attemptId: string;
  position: number;
  choices: Choice[];
}) {
  const [state, action, pending] = useActionState<LessonFormState, FormData>(
    answerStep,
    null,
  );
  const [choice, setChoice] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError ?? state?.error;
  // Time on the question, measured here so server and browser clocks never need to agree.
  const shown = useRef<number | null>(null);
  const elapsed = useRef<HTMLInputElement>(null);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const missing = !choice
          ? "Choose an answer first."
          : !confidence
            ? "Rate how sure you are before you check."
            : null;
        setLocalError(missing);
        if (missing) e.preventDefault();
        else if (elapsed.current && shown.current !== null)
          elapsed.current.value = String(
            Math.round(performance.now() - shown.current),
          );
      }}
      className="mt-8 space-y-8"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="attemptId" value={attemptId} />
      <input type="hidden" name="position" value={position} />
      <input
        type="hidden"
        name="elapsedMs"
        ref={(el) => {
          elapsed.current = el;
          if (el && shown.current === null) shown.current = performance.now();
        }}
        defaultValue=""
      />

      <fieldset>
        <legend className="mb-3 text-sm font-medium text-quiet">
          Choose one answer
        </legend>
        <div className="grid gap-2.5">
          {choices.map((c) => (
            <label
              key={c.label}
              className="flex cursor-pointer gap-4 rounded-[3px] bg-mist px-4 py-3.5 ring-1 ring-hairline transition has-[:checked]:bg-white has-[:checked]:ring-2 has-[:checked]:ring-hema has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hema"
            >
              <input
                type="radio"
                name="choice"
                value={c.label}
                checked={choice === c.label}
                onChange={() => {
                  setChoice(c.label);
                  setLocalError(null);
                }}
                className="sr-only"
              />
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold text-hema ring-1 ring-hema/40"
              >
                {c.label}
              </span>
              <span className="pt-0.5 text-[1.0625rem] leading-snug text-specimen">
                <span className="sr-only">{c.label}. </span>
                {c.text}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-[1.0625rem] font-medium text-specimen">
          Before you check: how sure are you?
        </legend>
        <div className="flex flex-wrap gap-2">
          {CONFIDENCE.map((o) => (
            <label
              key={o.value}
              className="cursor-pointer rounded-full px-5 py-2.5 text-[0.98rem] font-medium text-hema ring-1 ring-hema/30 transition has-[:checked]:bg-hema has-[:checked]:text-white has-[:checked]:ring-hema has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hema"
            >
              <input
                type="radio"
                name="confidence"
                value={o.value}
                checked={confidence === o.value}
                onChange={() => {
                  setConfidence(o.value);
                  setLocalError(null);
                }}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div aria-live="assertive" className="min-h-6">
        {error && (
          <p className="text-[0.98rem] font-medium text-[#A3304F]">{error}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center rounded-full bg-eosin px-7 text-[1rem] font-semibold text-white transition-colors hover:bg-eosin-ink disabled:opacity-60"
      >
        {pending ? "Checking…" : "Check answer"}
      </button>
    </form>
  );
}
