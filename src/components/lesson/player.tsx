import Link from "next/link";
import { redirect } from "next/navigation";
import { DraftBadge } from "@/components/lesson/badges";
import { LessonProgress } from "@/components/lesson/progress-bar";
import { QuestionForm } from "@/components/lesson/question-form";
import { AnsweredChoices, PassageBlock, QuestionHeader, RemediateView, RevealView, Stem, TeachView } from "@/components/lesson/step-views";
import { isQuestionStep, progress, remediationFor, resolveStep, reveal } from "@/lib/lessons/flow";
import type { LoadedAttempt } from "@/lib/lessons/service";

// One step of a lesson attempt. Shared by the public player (/lessons/[slug]/a/[attemptId]) and
// the admin draft preview (/admin/lessons/[id]/preview/a/[attemptId]); `base` is the attempt's URL.

export function LessonPlayer({
  attempt: a,
  base,
  introHref,
  requested,
  scope,
}: {
  attempt: LoadedAttempt;
  base: string;
  introHref: string;
  requested: number | null;
  scope?: "admin";
}) {
  const s = a.snapshot;
  const position = resolveStep(s, a.answered, requested);
  if (position >= s.steps.length) redirect(`${base}/result`);
  if (requested !== null && requested !== position) redirect(`${base}?step=${position}`);

  const step = s.steps[position];
  const next = position + 1 >= s.steps.length ? `${base}/result` : `${base}?step=${position + 1}`;
  const questionSteps = s.steps.filter(isQuestionStep);
  const nextStep = s.steps[position + 1];
  const nextLabel = !nextStep ? "See your results" : nextStep.kind === "RETEST" ? "Try the retest" : nextStep.kind === "TEACH" ? "Next idea" : "Continue";

  let body: React.ReactNode;
  if (step.kind === "TEACH") {
    body = <TeachView step={step} next={next} />;
  } else if (step.kind === "REMEDIATE") {
    body = <RemediateView rem={remediationFor(s, step, a.answers)} next={next} nextLabel={nextLabel} />;
  } else {
    const q = step.question!;
    const answer = a.answers.find((x) => x.stepPosition === position);
    const number = questionSteps.findIndex((x) => x.position === position) + 1;
    const r = answer ? reveal(s, q, answer) : null;
    body = (
      <article>
        <QuestionHeader step={step} number={number} of={questionSteps.length} />
        <PassageBlock q={q} />
        <Stem q={q} />
        {answer && r ? (
          <>
            <AnsweredChoices q={q} chosen={answer.choiceLabel} />
            <RevealView r={r} next={next} nextLabel={nextLabel} />
          </>
        ) : (
          <QuestionForm slug={s.slug} attemptId={a.id} position={position} scope={scope} choices={q.choices.map((c) => ({ label: c.label, text: c.text }))} />
        )}
      </article>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-28 pt-10 sm:px-8 sm:pt-16">
      <div className="space-y-4">
        {a.mode === "preview" && <DraftBadge />}
        <p className="text-sm text-quiet">
          <Link href={introHref} className="underline-offset-4 hover:underline">
            {s.title}
          </Link>
        </p>
        <LessonProgress p={progress(s, position, a.answered)} />
      </div>
      <div className="mt-10">{body}</div>
      {position > 0 && (
        <p className="mt-12">
          <Link href={`${base}?step=${position - 1}`} className="text-[0.98rem] text-fixative-ink underline-offset-4 hover:underline">
            Back to the previous step
          </Link>
        </p>
      )}
    </div>
  );
}
