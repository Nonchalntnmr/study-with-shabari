import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Band, ButtonLink, Card, Checks, H2, Kicker, Lead, PaymentNote, Wrap } from "@/components/b/primitives";
import { Hero } from "@/components/b/hero";
import { DraftBadge } from "@/components/lesson/badges";
import { admissionsHeadline, admissionsHelp, bio, faq, mcatTutoring, mudzi, notes, research, teaching } from "@/lib/founder-facts";
import { getFeaturedLesson } from "@/lib/public-data";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return (
    <>
      <Hero />
      <TwoServices />
      <FreeToStart />
      <MeetShabari />
      <Faq />
      <Closing />
    </>
  );
}

function TwoServices() {
  return (
    <Band labelledBy="services-h">
      <H2 id="services-h">Two services, one teacher.</H2>
      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col">
          <Kicker>MCAT Prep</Kicker>
          <h3 className="mt-3 text-[1.6rem]">{mcatTutoring.headline}</h3>
          <Checks items={mcatTutoring.points} className="mt-7" />
          <div className="mt-auto pt-9">
            <ButtonLink href="/mcat">Explore MCAT Prep</ButtonLink>
          </div>
        </Card>
        <Card className="flex flex-col">
          <Kicker>College Admissions</Kicker>
          <h3 className="mt-3 text-[1.6rem]">{admissionsHeadline}</h3>
          <Checks items={admissionsHelp.map((h) => h.body)} className="mt-7" />
          <div className="mt-auto pt-9">
            <ButtonLink href="/admissions">Explore Admissions Consulting</ButtonLink>
          </div>
        </Card>
      </div>
    </Band>
  );
}

async function FreeToStart() {
  const lesson = await getFeaturedLesson();
  const items = [
    {
      href: "/practice",
      title: "Free practice test",
      body: "Exam-style interface: passage on the left, question on the right, a timer, flag-for-review, a question navigator, and an explanation for every question.",
      cta: "Start a practice set",
    },
    ...(lesson
      ? [
          {
            href: `/lessons/${lesson.slug}`,
            title: "Free interactive lesson",
            body: `${lesson.title}: ${lesson.questions} questions across the three science sections, the reasoning after every answer, and a retest on each idea.`,
            cta: "Start the lesson",
            draft: lesson.draft,
          },
        ]
      : []),
    {
      href: "/resources",
      title: "Free MCAT notes",
      body: `${notes.headline} ${notes.cards.map((c) => c.title).join(", ")}.`,
      cta: "Open the notes",
    },
  ];
  return (
    <Band tone="mist" labelledBy="free-h">
      <Kicker>MCAT Prep</Kicker>
      <H2 id="free-h" className="mt-3">
        Start free. No signup.
      </H2>
      <div className={`mt-12 grid gap-5 ${items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        {items.map((i) => (
          <Card key={i.href} className="flex flex-col">
            {"draft" in i && i.draft && <DraftBadge />}
            <h3 className="mt-1 text-[1.4rem]">{i.title}</h3>
            <p className="mt-3 flex-1 text-[1.0625rem] leading-relaxed text-quiet">{i.body}</p>
            <Link href={i.href} className="mt-7 inline-flex items-center font-semibold text-eosin underline decoration-eosin/30 underline-offset-4 hover:decoration-eosin">
              {i.cta}
            </Link>
          </Card>
        ))}
      </div>
    </Band>
  );
}

function MeetShabari() {
  const highlights = [
    // "Peter J. Eloranta Fellow (top 6 MIT proposals)", up to the closing parenthesis.
    { label: "Research", text: `${research[0].org}: ${research[0].body.slice(0, research[0].body.indexOf(")") + 1)}.` },
    { label: "Teaching", text: teaching.slice(0, 2).join(". ") + "." },
    { label: "Founder", text: `${mudzi.name}, Malawi: ${mudzi.figures.map((f) => `${f.value} ${f.label}`).join(", ")}.` },
  ];
  return (
    <Band labelledBy="meet-h">
      <div className="grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <Image
          src="/images/shabari-portrait.jpg"
          alt="Shabari Shankar"
          width={700}
          height={875}
          sizes="(min-width: 1024px) 36vw, 90vw"
          className="h-auto w-full max-w-[30rem] rounded-2xl"
        />
        <div>
          <H2 id="meet-h">Hi, I’m Shabari.</H2>
          <Lead className="mt-6 text-specimen/85">{bio}</Lead>
          <dl className="mt-10 grid gap-6 border-t border-hairline pt-8">
            {highlights.map((h) => (
              <div key={h.label} className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-6">
                <dt className="font-semibold text-hema">{h.label}</dt>
                <dd className="text-[1.0625rem] leading-relaxed text-specimen/85">{h.text}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/research" variant="secondary">
              Research & Teaching
            </ButtonLink>
            <ButtonLink href="/about" variant="secondary">
              About Shabari
            </ButtonLink>
          </div>
        </div>
      </div>
    </Band>
  );
}

function Faq() {
  return (
    <Band tone="mist" labelledBy="faq-h">
      <H2 id="faq-h">Questions</H2>
      <dl className="mt-12 grid gap-x-16 gap-y-9 md:grid-cols-2">
        {faq.map((f) => (
          <div key={f.q} className="border-t border-hairline pt-5">
            <dt className="text-[1.125rem] font-semibold text-hema">{f.q}</dt>
            <dd className="mt-2 text-[1.0625rem] text-specimen/85">{f.a}</dd>
          </div>
        ))}
      </dl>
    </Band>
  );
}

function Closing() {
  return (
    <section aria-labelledby="closing-h" className="bg-hema py-20 text-white sm:py-24">
      <Wrap className="flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="closing-h" className="max-w-2xl text-[clamp(2rem,3.4vw,3rem)] text-white">
            Start with a free 15-minute call.
          </h2>
          <p className="mt-4 text-[1.125rem] text-white/80">For MCAT prep or college admissions.</p>
          <PaymentNote className="mt-2 text-white/70" />
        </div>
        <ButtonLink href="/book" variant="onDark">
          Book a free 15-min call
        </ButtonLink>
      </Wrap>
    </section>
  );
}
