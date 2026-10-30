import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/site/cta-band";
import { Container, PageIntro, SectionHeading } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { founder, sectionNames } from "@/lib/site";

export const metadata: Metadata = {
  title: "MCAT tutoring",
  description: `1:1 MCAT tutoring on Zoom for Chem/Phys, Bio/Biochem and Psych/Soc from ${founder.name} (${founder.mcat.total}).`,
  alternates: { canonical: "/mcat-tutoring" },
};

const steps = [
  { title: "Free consult call", body: "We talk through your timeline, scores and weak spots. You leave with a next step, whether or not we work together." },
  { title: "A plan around your test date", body: "We decide what to review, in what order, and how many practice passages to do each week." },
  { title: "Live 1:1 sessions on Zoom", body: "We work through the topics and question types you keep missing, and why the right answer is right." },
  { title: "Original practice", body: "Passage-based questions I write myself, so you’re not seeing the same third-party banks everyone else uses." },
];

export default function TutoringPage() {
  return (
    <>
      <PageIntro eyebrow="MCAT tutoring" title={<>1:1 help on the three <span className="hl">science sections</span>.</>}>
        I scored {founder.mcat.sections.CP} in Chem/Phys, {founder.mcat.sections.BB} in Bio/Biochem and {founder.mcat.sections.PS} in
        Psych/Soc. I tutor all three.
      </PageIntro>

      <section className="py-20">
        <Container>
          <SectionHeading eyebrow="How it works" title="From first call to test day." />
          <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border bg-white p-6">
                <span className="text-sm font-semibold tabular-nums text-blue">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="border-y bg-white py-20">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="What we work on" title="Content is only half of it.">
              The other half is learning how the test asks questions. That’s what I focus on with students.
            </SectionHeading>
            <Button asChild size="lg" className="h-11 px-5">
              <Link href="/book">Book a free call</Link>
            </Button>
          </div>
          <dl className="divide-y border-y">
            {(["CP", "BB", "PS"] as const).map((code) => (
              <div key={code} className="grid grid-cols-[1fr_auto] gap-4 py-5">
                <dt className="font-medium">{sectionNames[code]}</dt>
                <dd className="text-sm font-semibold tabular-nums text-navy">My score: {founder.mcat.sections[code]}</dd>
              </div>
            ))}
            <div className="py-5 text-sm text-muted-foreground">
              CARS isn’t something I tutor. On the free call I can point you to what worked for me.
            </div>
          </dl>
        </Container>
      </section>

      <CtaBand title="See if we’re a good fit." />
    </>
  );
}
