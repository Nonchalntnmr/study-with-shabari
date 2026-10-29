import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { ScoreReport } from "@/components/site/score-report";
import { Container, PageIntro } from "@/components/site/section";
import { founder } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Shabari",
  description: `${founder.name} is ${founder.standing} who scored ${founder.mcat.total} on the MCAT in ${founder.mcat.taken}.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageIntro eyebrow="About" title={<>Hi, I’m {founder.shortName}.</>} />
      <section className="py-16 sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5 text-lg leading-relaxed text-ink/85">
            <p>
              I’m {founder.standing}, double majoring in {founder.majors}, and I’m headed to {founder.goal}.
            </p>
            <p>
              I took the MCAT in {founder.mcat.taken} and scored a {founder.mcat.total}. Studying taught me that content is only half of
              it: the other half is learning how the test asks questions. That’s what I focus on with students, and why I write my own
              practice questions instead of recycling the same third-party banks.
            </p>
            <p>
              I’ve taught MIT chemistry recitations, written expert-level biology questions, and done research in genomics, immunology,
              and surgical AI. I like explaining hard things simply.
            </p>
            <ul className="grid gap-3 pt-4 sm:grid-cols-2">
              {[`${founder.mcat.total} MCAT (Chem/Phys ${founder.mcat.sections.CP}, Bio/Biochem ${founder.mcat.sections.BB}, Psych/Soc ${founder.mcat.sections.PS})`, `${founder.school} ${founder.majors.replace(" and ", " + ")}`, ...founder.experience].map((f) => (
                <li key={f} className="border-l-[3px] border-mark pl-3 text-base">
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:pt-2">
            <ScoreReport />
          </div>
        </Container>
      </section>
      <CtaBand />
    </>
  );
}
