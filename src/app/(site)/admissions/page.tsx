import type { Metadata } from "next";
import { BookingBand } from "@/components/b/booking-band";
import { Band, ButtonLink, Card, Checks, H2, Kicker, PaymentNote, Wrap } from "@/components/b/primitives";
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

function SchoolTiles() {
  return (
    <ul aria-label="Admitted to" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {admittedTo.map((s) => (
        <li key={s} className="flex min-h-14 flex-col items-center justify-center rounded-xl border border-hairline bg-white px-2 py-2 text-center">
          <span className="text-[1rem] font-bold text-hema">{s}</span>
          {s === "Penn" && <span className="text-[0.7rem] font-medium leading-tight text-quiet">{pennNote}</span>}
        </li>
      ))}
    </ul>
  );
}

function RecordCard() {
  return (
    <div className="rounded-2xl border border-hairline bg-white p-7 sm:p-10">
      <p className="text-[0.95rem] font-semibold text-quiet">My high school record</p>
      <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-8">
        {highSchool.stats.map((s) => (
          <div key={s.label}>
            <dt className="text-[0.95rem] text-quiet">{s.label}</dt>
            <dd className="mt-1 text-[clamp(1.75rem,3vw,2.6rem)] font-bold leading-none tracking-[-0.03em] text-hema">{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** IB subject scores on their real 1–7 scale. */
function IbScores() {
  return (
    <figure aria-labelledby="ib-cap">
      <figcaption id="ib-cap" className="flex items-baseline justify-between">
        <span className="text-[1.25rem] font-bold text-hema">IB Diploma</span>
        <span className="text-[1.25rem] font-bold text-hema">40/45</span>
      </figcaption>
      <ul className="mt-5 grid gap-3">
        {highSchool.ib.map((s) => (
          <li key={s.subject} className="grid grid-cols-[2.25rem_1fr_minmax(0,8rem)_1.5rem] items-center gap-3 text-[0.98rem] sm:grid-cols-[2.25rem_9rem_1fr_1.5rem]">
            <span className="font-semibold text-quiet">{s.level}</span>
            <span className="text-specimen">{s.subject}</span>
            <span aria-hidden className="relative h-1.5 rounded-full bg-hairline">
              <span className="absolute inset-y-0 left-0 rounded-full bg-hema" style={{ width: `${(s.score / 7) * 100}%` }} />
            </span>
            <span className="text-right font-bold text-hema">{s.score}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-quiet">Subject scores out of 7.</p>
    </figure>
  );
}

export default function AdmissionsPage() {
  return (
    <>
      <section aria-labelledby="adm-h" className="bg-white pb-20 pt-10 sm:pb-28 sm:pt-16">
        <Wrap>
          <SchoolTiles />
          <div className="mt-12 grid items-center gap-x-16 gap-y-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <Kicker>College Admissions Consulting</Kicker>
              <h1 id="adm-h" className="mt-4 text-[clamp(2.35rem,4.2vw,3.9rem)] leading-[1.04]">
                {admissionsHeadline}
              </h1>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/book?service=admissions">Book a free 15-min call</ButtonLink>
                <ButtonLink href="#help" variant="secondary">
                  What I help with
                </ButtonLink>
              </div>
            </div>
            <RecordCard />
          </div>
        </Wrap>
      </section>

      <Band tone="mist" id="record" labelledBy="record-h">
        <Kicker>My high school record</Kicker>
        <H2 id="record-h" className="mt-3">
          The record behind the admissions.
        </H2>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <Card>
            <IbScores />
            <p className="mt-8 border-t border-hairline pt-6 text-[1.0625rem] text-specimen/85">{highSchool.extendedEssay}</p>
          </Card>
          <Card>
            <h3 className="text-[1.25rem]">Activities</h3>
            <Checks items={highSchool.activities} className="mt-5" />
          </Card>
        </div>
      </Band>

      <Band id="help" labelledBy="help-h">
        <Kicker>What I help with</Kicker>
        <H2 id="help-h" className="mt-3">
          The whole application, piece by piece.
        </H2>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {admissionsHelp.map((h) => (
            <li key={h.title} className="rounded-2xl border border-hairline bg-white p-7">
              <p className="text-sm font-semibold text-eosin">{h.title}</p>
              <h3 className="mt-2 text-[1.2rem] leading-snug">{h.body}</h3>
            </li>
          ))}
        </ul>
        <ol aria-label="When to start" className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-2">
          {admissionsTimeline.map((t, i) => (
            <li key={t.when} className="bg-mist p-7">
              <p className="text-sm font-semibold tabular-nums text-eosin">Step {i + 1}</p>
              <p className="mt-2 text-[1.25rem] font-bold text-hema">{t.when}</p>
              <p className="mt-1 text-[1.0625rem] text-specimen/85">{t.what}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-quiet">When should high schoolers start? Junior year for planning; essays the summer before senior year.</p>
      </Band>

      <Band tone="mist" id="essays" labelledBy="essays-h">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <Kicker>Why trust me with your essays</Kicker>
            <H2 id="essays-h" className="mt-3">
              Three MIT writing prizes, and a news editor’s desk at The Tech.
            </H2>
          </div>
          <Checks items={essayCredentials} />
        </div>
      </Band>

      <Band id="mentoring" labelledBy="mentoring-h">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <Kicker>Experience mentoring students</Kicker>
            <H2 id="mentoring-h" className="mt-3">
              Mentoring students through MIT programs.
            </H2>
          </div>
          <Checks items={mentoring} />
        </div>
      </Band>

      <Band tone="mist" id="admissions-pricing" labelledBy="adm-pricing-h">
        <Kicker>Admissions pricing</Kicker>
        <H2 id="adm-pricing-h" className="mt-3">
          Every option starts with a free call.
        </H2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {admissionsPricing.map((p) => (
            <Card key={p.name} className="flex flex-col">
              <h3 className="text-[1.25rem]">{p.name}</h3>
              <p className="mt-4 text-[1.75rem] font-bold tracking-[-0.02em] text-hema">{p.price ?? "Priced on your consult call"}</p>
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
