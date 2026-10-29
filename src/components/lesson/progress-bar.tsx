import type { Progress } from "@/lib/lessons/flow";

export function LessonProgress({ p }: { p: Progress }) {
  return (
    <div className="flex items-center gap-4">
      <p className="shrink-0 text-sm text-quiet" data-testid="step-count">
        Step {p.step} of {p.of}
      </p>
      <div
        role="progressbar"
        aria-label="Lesson progress"
        aria-valuemin={0}
        aria-valuemax={p.of}
        aria-valuenow={p.step}
        aria-valuetext={`Step ${p.step} of ${p.of}, ${p.questionsAnswered} of ${p.questions} questions answered`}
        className="h-1 w-full overflow-hidden rounded-full bg-hairline"
      >
        <div className="h-full rounded-full bg-hema" style={{ width: `${(p.step / p.of) * 100}%` }} />
      </div>
    </div>
  );
}
