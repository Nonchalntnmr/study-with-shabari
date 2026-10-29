import { BookOpen, CalendarCheck, ClipboardList, GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/site/cta-band";
import { ExamPreview } from "@/components/site/exam-preview";
import { PlanCards } from "@/components/site/plan-cards";
import { ResourceList } from "@/components/site/resource-list";
import { ScoreReport } from "@/components/site/score-report";
import { Container, Eyebrow, SectionHeading } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { founder } from "@/lib/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const services = [
  {
    icon: GraduationCap,
    title: "1:1 MCAT tutoring",
    body: "Live sessions on the three science sections, built around your test date and the questions you keep missing.",
    href: "/mcat-tutoring",
    cta: "How tutoring works",
  },
  {
    icon: ClipboardList,
    title: "Free practice sets",
    body: "Original passage-based and discrete questions in a timed, test-day interface, with an explanation for every answer.",
    href: "/practice",
    cta: "Start practicing",
  },
  {
    icon: BookOpen,
    title: "Free study notes",
    body: "The content-review notes I made while studying, condensed into one place per section. No email required.",
    href: "/resources",
    cta: "Get the notes",
  },
  {
    icon: CalendarCheck,
    title: "Admissions guidance",
    body: "Help with the application side, from planning your timeline to the essays, scoped on a free call.",
    href: "/admissions",
    cta: "Learn more",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-sky via-background to-background">
        <Container className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <Eyebrow className="mb-5">MCAT tutoring · {founder.school} premed</Eyebrow>
            <h1 className="max-w-[15ch] text-5xl font-semibold tracking-[-0.035em] sm:text-6xl">
              MCAT tutoring from someone who just <span className="hl">took it</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
              I scored a {founder.mcat.total} in {founder.mcat.taken}. My notes and practice questions are free. If you want a plan built
              around you, let’s talk.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link href="/book">Book a free 15-min call</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 bg-white px-6 text-base">
                <Link href="/practice">Try a free practice set</Link>
              </Button>
            </div>
          </div>
          <ScoreReport />
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeading eyebrow="How I can help" title="Everything you need, nothing you don’t.">
            Start with the free material. When you want someone in your corner, we’ll build a plan together.
          </SectionHeading>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map(({ icon: Icon, ...s }) => (
              <Link key={s.href} href={s.href} className="group flex flex-col rounded-2xl border bg-white p-6 transition hover:-translate-y-0.5 hover:border-navy/40 hover:shadow-md">
                <span className="grid size-10 place-items-center rounded-xl bg-sky text-navy">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.body}</p>
                <span className="mt-5 text-sm font-medium text-blue group-hover:underline">{s.cta} →</span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y bg-white py-20 sm:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Practice" title="Practice like it’s test day.">
              Content is only half of the MCAT. The other half is learning how the test asks questions. My practice sets run in an
              interface built to feel like the real thing.
            </SectionHeading>
            <ul className="space-y-3 text-[0.95rem]">
              {[
                "Highlight passages, strike out answers, flag questions for review",
                "Timed or untimed, with a clock the server keeps honest",
                "Close the tab and pick up exactly where you left off",
                "A full explanation for every answer choice, right and wrong",
                "No account needed. Sign up only if you want your history saved",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-blue" />
                  {t}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-8 h-11 px-5">
              <Link href="/practice">Browse practice sets</Link>
            </Button>
          </div>
          <ExamPreview />
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeading eyebrow="Free notes" title="My study notes, free.">
            The content-review docs I made while studying, one per section.
          </SectionHeading>
          <ResourceList kind="NOTES" />
        </Container>
      </section>

      <section className="border-t bg-white py-20 sm:py-24">
        <Container>
          <SectionHeading eyebrow="Work with me" title="Every option starts with a free call.">
            We’ll figure out where you are and what you need before you commit to anything.
          </SectionHeading>
          <PlanCards />
          <p className="mt-8 text-sm text-muted-foreground">
            Payment is by Zelle, arranged after your consultation. There’s no card checkout on this site.{" "}
            <Link href="/pricing" className="font-medium text-blue hover:underline">
              Pricing details
            </Link>
          </p>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <Eyebrow className="mb-3">About</Eyebrow>
            <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">Hi, I’m {founder.shortName}.</h2>
          </div>
          <div className="space-y-4 text-lg text-muted-foreground">
            <p>
              I’m {founder.standing}, double majoring in {founder.majors}, and I’m headed to {founder.goal}.
            </p>
            <p>
              Studying taught me that content is only half of it. The other half is learning how the test asks questions. That’s what I
              focus on with students, and it’s why I write my own practice questions instead of recycling the same third-party banks.
            </p>
            <Link href="/about" className="inline-block text-base font-medium text-blue hover:underline">
              More about me →
            </Link>
          </div>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
