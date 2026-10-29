"use client";

import { Strikethrough } from "lucide-react";
import type { RunnerChoice, RunnerResponse } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

export function ChoiceList({
  questionId,
  choices,
  response,
  onSelect,
  onToggleStrike,
}: {
  questionId: string;
  choices: RunnerChoice[];
  response: RunnerResponse;
  onSelect: (choiceId: string) => void;
  onToggleStrike: (choiceId: string) => void;
}) {
  return (
    <fieldset className="mt-6">
      <legend className="sr-only">Answer choices</legend>
      <ul className="space-y-2.5">
        {choices.map((c) => {
          const selected = response.selectedChoiceId === c.id;
          const struck = response.eliminatedChoiceIds.includes(c.id);
          return (
            <li key={c.id} className="flex items-stretch gap-2">
              <label
                onContextMenu={(e) => {
                  e.preventDefault();
                  onToggleStrike(c.id);
                }}
                className={cn(
                  "flex flex-1 cursor-pointer items-start gap-3 rounded-xl border bg-white px-4 py-3 transition-colors",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue",
                  selected ? "border-navy bg-sky ring-1 ring-navy" : "hover:border-navy/40",
                )}
              >
                <input
                  type="radio"
                  name={`q-${questionId}`}
                  value={c.id}
                  checked={selected}
                  onChange={() => onSelect(c.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                    selected ? "border-navy bg-navy text-white" : "border-input text-ink/70",
                  )}
                >
                  {c.label}
                </span>
                <span className={cn("font-reading leading-relaxed", struck && "text-muted-foreground line-through decoration-ink/60")}>
                  <span className="sr-only">{c.label}. </span>
                  {c.text}
                  {struck && <span className="sr-only"> (struck out)</span>}
                </span>
              </label>
              <button
                type="button"
                onClick={() => onToggleStrike(c.id)}
                aria-pressed={struck}
                aria-label={`${struck ? "Restore" : "Strike out"} choice ${c.label}`}
                title={struck ? "Restore choice" : "Strike out choice (or right-click it)"}
                className={cn(
                  "grid w-10 shrink-0 place-items-center rounded-xl border bg-white text-muted-foreground hover:text-navy",
                  struck && "border-navy/40 bg-muted text-navy",
                )}
              >
                <Strikethrough className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
