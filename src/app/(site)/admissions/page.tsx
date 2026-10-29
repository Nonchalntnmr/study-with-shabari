import type { Metadata } from "next";
import Image from "next/image";
import { BookingBand } from "@/components/b/booking-band";
import { Band, ButtonLink, Card, H2, Kicker, PaymentNote, Rows, TextLink, Wrap } from "@/components/b/primitives";
import {
  admissionsHeadline,
  admissionsHelp,
  admissionsPricing,
  admissionsTimeline,
  admittedTo,
  essayCredentials,
  highSchool,
  mentoring,
  pennNote,
} from "@/lib/founder-facts";

export const metadata: Metadata = {
  title: "College Admissions Consulting",
  description: `${admissionsHeadline} Essays, activities list, school list, interview prep, application timeline, and SAT and ACT strategy.`,
  alternates: { canonical: "/admissions" },
};

/** School names as set type. No tiles, no logos. */
function SchoolNames() {
  return (
    <ul aria-label="Admitted to" className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
      {admittedTo.map((s) => (
        <li key={s} className="font-display text-[clamp(1.5rem,2.4vw,2.1rem)] leading-tight text-hema">
          {s}
          {s === "Penn" && <span className="ml-2 font-sans text-[0.95rem] text-quiet">({pennNote})</span>}
        </li>
      ))}
    </ul>
  );
}

function RecordCard() {
  return (
    <div className="rounded-2xl border border-hairline bg-white p-8 sm:p-10">
      <p className="text-[0.95rem] font-semibold text-hema">{highSchool.title}</p>
      <dl className="mt-7 grid grid-cols-2 gap-x-8 gap-y-8">
        {highSchool.stats.map((s) => (
          <div key={s.label}>
            <dt className="text-[0.95rem] text-quiet">{s.label}</dt>
            <dd className="mt-1 font-display text-[clamp(2rem,3.2vw,2.9rem)] leading-none text-hema">{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-8 border-t border-hairline pt-5 text-[0.95rem] leading-relaxed text-quiet">{highSchool.disclaimer}</p>
    </div>
  );
}

/** IB subject scores on their real 1–7 scale. */
function IbScores() {
  return (
    <figure aria-labelledby="ib-cap">
      <figcaption id="ib-cap" className="flex items-baseline justify-between border-b border-hairline pb-4">
        <span className="font-display text-[1.6rem] text-hema">IB Diploma</span>
        <span className="font-display text-[1.6rem] text-hema">40/45</span>
      </figcaption>
      <ul className="mt-5 grid gap-3.5">
        {highSchool.ib.map((s) => (
          <li key={s.subject} className="grid grid-cols-[2.25rem_1fr_minmax(0,8rem)_1.5rem] items-center gap-3 text-[0.98rem] sm:grid-cols-[2.25rem_9rem_1fr_1.5rem]">
            <span className="font-semibold text-quiet">{s.level}</span>
            <span className="text-specimen">{s.subject}</span>
            <span aria-hidden className="relative h-[3px] rounded-full bg-hairline">
              <span className="absolute inset-y-0 left-0 rounded-full bg-hema" style={{ width: `${(s.score / 7) * 100}%` }} />
            </span>
            <span className="text-right font-display text-[1.2rem] leading-none text-hema">{s.score}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-quiet">Subject scores out of 7.</p>
    </figure>
  );
}

// The three MIT writing prizes, then the newspaper and the humanities honor.
const prizes = essayCredentials.slice(0, 3).map((c) => {
  const [name, ...rest] = c.split(", MIT");
  return { name, detail: `MIT${rest.join(", MIT")}` };
});
const otherWriting = essayCredentials.slice(3);

export default function AdmissionsPage() {
  return (
    <>
      <section aria-labelledby="adm-h" className="bg-white pb-24 pt-12 sm:pb-32 sm:pt-20">
        <Wrap>
          <Kicker>College Admissions Consulting</Kicker>
          <div className="mt-6">
            <SchoolNames />
          </div>
          <div className="mt-14 grid items-start gap-x-20 gap-y-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h1 id="adm-h" className="max-w-[16ch] text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.03]">
                {admissionsHeadline}
              </h1>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                <ButtonLink href="/book?service=admissions">Book a free 15-min call</ButtonLink>
                <TextLink href="#help">What I help with</TextLink>
              </div>
            </div>
            <RecordCard />
          </div>
        </Wrap>
      </section>

      <section id="essays" aria-labelledby="essays-h" className="scroll-mt-20 bg-mist">
        <div className="mx-auto grid max-w-[1440px] items-stretch lg:grid-cols-[0.85fr_1.15fr]">
          <div className="relative min-h-[30rem] lg:min-h-full">
            <Image src="/images/shabari-portrait.jpg" alt="Shabari Shankar" fill sizes="(min-width: 1024px) 42vw, 100vw" className="object-cover object-[50%_30%]" />
          </div>
          <div className="px-5 py-20 sm:px-12 sm:py-28 lg:px-20">
            <Kicker>Why trust me with your essays</Kicker>
            <h2 id="essays-h" className="mt-4 max-w-xl text-[clamp(2.2rem,3.8vw,3.4rem)]">
              Three MIT writing prizes, and a news editor’s desk at The Tech.
            </h2>
            <ul className="mt-12 grid gap-8">
              {prizes.map((p) => (
                <li key={p.name}>
                  <p className="font-display text-[clamp(1.6rem,2.6vw,2.25rem)] leading-tight text-hema">{p.name}</p>
                  <p className="mt-1 text-[1rem] text-quiet">{p.detail}</p>
                </li>
              ))}
            </ul>
            <div className="mt-12 grid gap-6 border-t border-hairline pt-8">
              {otherWriting.map((w) => (
                <p key={w} className="max-w-[62ch] text-[1.125rem] leading-relaxed text-specimen/90">
                  {w}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Band id="help" labelledBy="help-h">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <Kicker>What I help with</Kicker>
            <H2 id="help-h" className="mt-4">
              The whole application, piece by piece.
            </H2>
          </div>
          <div>
            <dl className="border-t border-hairline">
              {admissionsHelp.map((h) => (
                <div key={h.title} className="grid gap-1 border-b border-hairline py-6 sm:grid-cols-[9rem_1fr] sm:gap-8">
                  <dt className="pt-1 text-[0.95rem] font-semibold text-quiet">{h.title}</dt>
                  <dd className="font-display text-[1.45rem] leading-snug text-hema">{h.body}</dd>
                </div>
              ))}
            </dl>
            <ol aria-label="When to start" className="mt-14 grid gap-10 sm:grid-cols-2">
              {admissionsTimeline.map((t) => (
                <li key={t.when} className="border-t-2 border-hema pt-5">
                  <p className="text-[0.95rem] font-semibold text-quiet">{t.when}</p>
                  <p className="mt-1 font-display text-[2rem] leading-tight text-hema">{t.what}</p>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm text-quiet">When should high schoolers start? Junior year for planning; essays the summer before senior year.</p>
          </div>
        </div>
      </Band>

      <Band tone="mist" id="record" labelledBy="record-h">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <Kicker>My high school record</Kicker>
            <H2 id="record-h" className="mt-4">
              The record behind the admissions.
            </H2>
            <p className="mt-6 max-w-sm text-[1rem] leading-relaxed text-quiet">{highSchool.disclaimer}</p>
          </div>
          <div className="grid gap-14">
            <IbScores />
            <p className="font-display text-[1.45rem] leading-snug text-hema">{highSchool.extendedEssay}</p>
            <div>
              <h3 className="text-[1.6rem]">Activities</h3>
              <Rows items={highSchool.activities} className="mt-5" />
            </div>
          </div>
        </div>
      </Band>

      <Band id="mentoring" labelledBy="mentoring-h">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <Kicker>Experience mentoring students</Kicker>
            <H2 id="mentoring-h" className="mt-4">
              Mentoring students through MIT programs.
            </H2>
          </div>
          <Rows items={mentoring} size="lg" />
        </div>
      </Band>

      <Band tone="mist" id="admissions-pricing" labelledBy="adm-pricing-h">
        <Kicker>Admissions pricing</Kicker>
        <H2 id="adm-pricing-h" className="mt-4">
          Every option starts with a free call.
        </H2>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {admissionsPricing.map((p) => (
            <Card key={p.name} className="flex flex-col">
              <h3 className="text-[1.45rem]">{p.name}</h3>
              <p className="mt-4 font-display text-[1.9rem] leading-tight text-hema">{p.price ?? "Priced on your consult call"}</p>
              {p.includes && <p className="mt-3 text-[1.0625rem] text-quiet">{p.includes}</p>}
            </Card>
          ))}
        </div>
        <PaymentNote className="mt-8" />
      </Band>

      <BookingBand service="admissions" />
      <Wrap className="py-8">
        <p className="text-sm text-quiet">Independent consulting. Not affiliated with or endorsed by MIT or any other university.</p>
      </Wrap>
    </>
  );
}
