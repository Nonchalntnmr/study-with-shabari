import bank from "../../../content/samples/sample-bank.json";
import { splitParagraphs } from "@/lib/exam/passage";
import { PracticePreview, type PreviewQuestion } from "./practice-preview";

// The second question of the Chem/Phys sample set, exactly as students see it.
const exam = bank.exams.find((e) => e.slug === "cp-sample-set-1")!;
const item = exam.items[0] as (typeof exam.items)[number] & { questions: { id: string; stem: string; explanation: string; choices: { label: string; text: string; correct?: boolean; rationale: string }[] }[]; title: string; body: string; id: string };
const q = item.questions[1];
const total = exam.items.reduce((n, i) => n + ("questions" in i && Array.isArray(i.questions) ? i.questions.length : 1), 0);

const passage = { id: item.id, title: item.title, paragraphs: splitParagraphs(item.body), source: null, figures: [] };
const question: PreviewQuestion = {
  setTitle: exam.title,
  setSlug: exam.slug,
  number: 2,
  of: total,
  stem: q.stem,
  choices: q.choices.map((c) => ({ id: c.label, label: c.label, text: c.text, correct: Boolean(c.correct), rationale: c.rationale })),
  explanation: q.explanation,
};

export function PracticeSection() {
  return (
    <section aria-labelledby="practice-h" className="mx-auto max-w-[1400px] px-5 py-28 sm:px-8 sm:py-36">
      <div className="max-w-3xl">
        <h2 id="practice-h" className="text-[clamp(2.5rem,5vw,4.5rem)]">
          Try a question.
        </h2>
        <p className="mt-6 text-[1.125rem] text-specimen/85">
          This is the practice software itself, with a passage from the free Chem/Phys set. Highlight the passage, strike out choices, then check your
          answer.
        </p>
      </div>
      <div className="mt-14">
        <PracticePreview passage={passage} question={question} />
      </div>
    </section>
  );
}
