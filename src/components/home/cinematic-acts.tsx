import { ButtonLink, TextLink } from "@/components/b/primitives";
import { Understanding } from "@/components/experience/slice/understanding";
import { paymentNote } from "@/lib/founder-facts";
import { publicQuestions } from "@/lib/lessons/dopamine-page";

// The home page's fourth and fifth acts: one of Shabari's six dopamine questions (Q6, then Q2),
// answered through the server action checkDopamineAnswer so no key is ever in the page; then
// booking. Right or wrong only, never a score estimate.

/** From her lesson, section 1. */
const LESSON_LINE = "Its amine (pKa ≈ 10) is protonated at physiological pH, so it carries a +1 charge and can’t cross the blood–brain barrier.";

export function LearningAct() {
  const qs = publicQuestions();
  const primary = qs.find((q) => q.id === "q6")!;
  const related = qs.find((q) => q.id === "q2")!;
  return (
    <section id="understand" aria-labelledby="understand-h" className="border-t border-[color:var(--exp-rule)] py-20 sm:py-28">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <p className="exp-label-caps text-[color:var(--exp-quiet)]">From the free dopamine lesson</p>
        <h2 id="understand-h" className="mt-3 max-w-3xl text-[clamp(2rem,3.6vw,3.1rem)] leading-[1.05]">
          Check your understanding
        </h2>
        <p className="mt-4 max-w-2xl text-[1.0625rem] text-[color:var(--exp-quiet)]">One of Shabari’s six dopamine questions. Pick an answer to see her explanation.</p>
        <div className="mt-12">
          <Understanding primary={primary} related={related} lessonLine={LESSON_LINE} numbers={[6, 2]} />
        </div>
      </div>
    </section>
  );
}

export function BookingAct() {
  return (
    <section aria-labelledby="book-act-h" className="border-t border-[color:var(--exp-rule)] bg-white py-20 sm:py-24">
      <div className="mx-auto flex max-w-[1320px] flex-col items-start gap-8 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="book-act-h" className="max-w-2xl text-[clamp(2rem,3.4vw,3rem)]">
            Start with a free consult call.
          </h2>
          <p className="mt-3 text-[1.0625rem] text-quiet">{paymentNote}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <ButtonLink href="/book?service=mcat">Book a free consult call</ButtonLink>
          <TextLink href="/dopamine">Read the free lesson</TextLink>
        </div>
      </div>
    </section>
  );
}
