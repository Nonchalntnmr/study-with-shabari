import type { Metadata } from "next";
import Image from "next/image";
import { Band, ButtonLink, H2, Lead, PaymentNote, TextLink, Wrap } from "@/components/b/primitives";
import { Hero } from "@/components/b/hero";
import { DraftBadge } from "@/components/lesson/badges";
import { bio, faq, mudzi, notes, research, teaching } from "@/lib/founder-facts";
import { getFeaturedLesson } from "@/lib/public-data";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return (
    <>
      <Hero />
      <FreeToStart />
      <MeetShabari />
      <Faq />
      <Closing />
    </>
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
    <Band labelledBy="free-h">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
        <H2 id="free-h">Start free. No signup.</H2>
        <p className="max-w-md text-[1.0625rem] text-quiet lg:justify-self-end">For MCAT students: practice, a lesson and the notes, all open to everyone.</p>
      </div>
      <div>
        <div className={`mt-14 grid gap-12 sm:grid-cols-2 ${items.length === 3 ? "lg:grid-cols-3" : ""}`}>
          {items.map((i) => (
            <div key={i.href} className="flex flex-col border-t-2 border-hema pt-6">
              {"draft" in i && i.draft && <DraftBadge />}
              <h3 className="text-[1.55rem]">{i.title}</h3>
              <p className="mt-3 flex-1 text-[1.0625rem] leading-relaxed text-quiet">{i.body}</p>
              <TextLink href={i.href} className="mt-6">
                {i.cta}
              </TextLink>
            </div>
          ))}
        </div>
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
    <section aria-labelledby="meet-h" className="bg-mist">
      <div className="mx-auto grid max-w-[1440px] items-stretch lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative min-h-[28rem] lg:min-h-full">
          <Image src="/images/shabari-portrait.jpg" alt="Shabari Shankar" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover object-[50%_30%]" />
        </div>
        <div className="px-5 py-20 sm:px-12 sm:py-28 lg:px-20">
          <H2 id="meet-h">Hi, I’m Shabari.</H2>
          <Lead className="mt-7 text-[1.1875rem] text-specimen/85">{bio}</Lead>
          <dl className="mt-12 grid gap-7">
            {highlights.map((h) => (
              <div key={h.label} className="grid gap-1 sm:grid-cols-[7.5rem_1fr] sm:gap-6">
                <dt className="text-[0.95rem] font-semibold text-hema">{h.label}</dt>
                <dd className="text-[1.0625rem] leading-relaxed text-specimen/85">{h.text}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4">
            <TextLink href="/research">Research & Teaching</TextLink>
            <TextLink href="/about">About Shabari</TextLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <Band labelledBy="faq-h">
      <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
        <H2 id="faq-h">Questions</H2>
        <dl className="border-t border-hairline">
          {faq.map((f) => (
            <div key={f.q} className="grid gap-2 border-b border-hairline py-6 sm:grid-cols-[1fr_1fr] sm:gap-10">
              <dt className="font-display text-[1.3rem] leading-snug text-hema">{f.q}</dt>
              <dd className="text-[1.0625rem] text-specimen/85">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
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
