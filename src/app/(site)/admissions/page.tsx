import type { Metadata } from "next";
import Image from "next/image";
import { Journey } from "@/components/admissions/journey";
import { BookingBand } from "@/components/b/booking-band";
import { ButtonLink, PaymentNote, TextLink, Wrap } from "@/components/b/primitives";
import {
  admissionsHeadline,
  admissionsHelp,
  admissionsPricing,
  admissionsResults,
  admissionsTimeline,
  essayCredentials,
  highSchool,
  mentoring,
  writingPrizes,
} from "@/lib/founder-facts";
import { cn } from "@/lib/utils";
import "./admissions.css";

export const metadata: Metadata = {
  title: "College Admissions Consulting",
  description: `${admissionsHeadline} Essays, activities list, school list, interview prep, application timeline, and SAT and ACT strategy.`,
  alternates: { canonical: "/admissions" },
};

// Admissions in a paper-and-serif world (the /experience/admissions prototype, made production):
// paper and index cards drawn in CSS, Newsreader on navy ink, one blue button per screen. Layout and
// visuals only: every word, link and fact is the page's approved copy from founder-facts, in the
// same order as before. No client JavaScript of its own; the one moving part, the journey's ink,
// is a scroll-driven CSS animation that stays still with reduced motion (admissions.css).

// The six headline schools as set type; the three full-scholarship offers sit under the record card,
// so the first screen on a phone still reaches the booking button.
const headlineSchools = admissionsResults.slice(0, 6);
const scholarshipOffers = admissionsResults.slice(6);

/** A section label: small capitals after a short rule. */
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("adm-label", className)}>{children}</p>;
}

/** School names as set type, each with its honor. No tiles, no logos. */
function SchoolNames() {
  return (
    <ul aria-label="Admitted to" className="adm-rollcall">
      {headlineSchools.map((a) => (
        <li key={a.school} className="font-display text-[clamp(1.5rem,2.4vw,2.15rem)] leading-tight text-hema">
          {a.school}
          {a.note && <span className="adm-honor ml-2">({a.note})</span>}
        </li>
      ))}
    </ul>
  );
}

/** The record as an index card, with a second sheet tucked behind it. */
function RecordCard() {
  return (
    <div className="adm-stack">
      <div className="adm-card rounded-[1.25rem] p-7 sm:p-10">
        <p className="adm-card-head text-[0.95rem] font-semibold text-hema">{highSchool.title}</p>
        <dl className="mt-7 grid grid-cols-2 gap-x-8 gap-y-8">
          {highSchool.stats.map((s) => (
            <div key={s.label}>
              <dt className="adm-caps text-quiet">{s.label}</dt>
              <dd className="mt-2 font-display text-[clamp(2.1rem,3.3vw,3rem)] leading-none text-hema tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 border-t border-[color:var(--adm-rule)] pt-5 text-[0.95rem] leading-relaxed text-quiet">{highSchool.disclaimer}</p>
      </div>
    </div>
  );
}

function ScholarshipOffers() {
  return (
    <div className="adm-stack mt-8" data-testid="scholarship-offers-card">
      <div className="adm-card rounded-[1.25rem] p-7 sm:p-10">
        <p className="adm-card-head text-[0.95rem] font-semibold text-hema">Also admitted, with scholarships</p>
        <ul className="mt-5 divide-y divide-[color:var(--adm-rule)]">
          {scholarshipOffers.map((a, i) => (
            <li key={a.school} className={cn("py-4 first:pt-1 last:pb-0", i === 0 && "pb-5")}>
              <span className={cn("block font-display leading-tight text-hema", i === 0 ? "text-[clamp(1.85rem,2.8vw,2.45rem)]" : "text-[clamp(1.45rem,2.1vw,1.85rem)]")}>{a.school}</span>{" "}
              <span className={cn("mt-1 block", i === 0 ? "font-display italic text-[1.2rem] text-hema" : "text-[1.02rem] text-quiet")}>({a.note})</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-[color:var(--adm-rule)] pt-4 text-[0.95rem] font-medium leading-relaxed text-hema">
          Also admitted with scholarships: Johns Hopkins (Hodson Trust Scholar, near full ride), Wake Forest (Carswell Scholar, full ride), UT Dallas (McDermott Scholar, full ride)
        </p>
      </div>
    </div>
  );
}

/** IB subject scores on their real 1–7 scale: seven marks per subject, the score inked in. */
function IbScores() {
  return (
    <figure aria-labelledby="ib-cap">
      <figcaption id="ib-cap" className="flex items-baseline justify-between border-b-2 border-hema pb-4">
        <span className="font-display text-[1.75rem] text-hema">IB Diploma</span>
        <span className="font-display text-[1.75rem] text-hema tabular-nums">40/45</span>
      </figcaption>
      <ul className="mt-2">
        {highSchool.ib.map((s) => (
          <li key={s.subject} className="adm-ib-row">
            <span className="adm-caps text-quiet">{s.level}</span>
            <span className="text-specimen">{s.subject}</span>
            <span aria-hidden className="adm-pips">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} data-on={i < s.score ? "" : undefined} />
              ))}
            </span>
            <span className="text-right font-display text-[1.3rem] leading-none text-hema">{s.score}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-quiet">Subject scores out of 7.</p>
    </figure>
  );
}

// The three MIT writing prizes, then the newspaper and the humanities honor.
const prizes = writingPrizes.map(([name, placing]) => ({ name, detail: `MIT · ${placing.replace(/^\((\d{4})\)$/, "$1")}` }));
const otherWriting = essayCredentials;

const h2 = "max-w-3xl text-[clamp(2.2rem,3.8vw,3.4rem)]";

export default function AdmissionsPage() {
  return (
    <div className="adm">
      <section aria-labelledby="adm-h" className="adm-paper pb-20 pt-10 sm:pb-28 sm:pt-16">
        <Wrap>
          <Label>College Admissions Consulting</Label>
          <div className="mt-5 border-y border-[color:var(--adm-rule)] py-4 sm:py-5">
            <SchoolNames />
          </div>
          <div className="mt-10 grid items-start gap-x-16 gap-y-16 sm:mt-14 lg:grid-cols-[1.12fr_0.88fr] xl:gap-x-24">
            <div>
              <h1 id="adm-h" className="max-w-[15ch] text-[clamp(2.2rem,5vw,4.85rem)] leading-[1.02]">
                {admissionsHeadline}
              </h1>
              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 sm:mt-10">
                <ButtonLink href="/book?service=admissions">Book a free consult call</ButtonLink>
                <TextLink href="#help">What I help with</TextLink>
              </div>
            </div>
            <div>
              <RecordCard />
              <ScholarshipOffers />
            </div>
          </div>
        </Wrap>
      </section>

      <section id="essays" aria-labelledby="essays-h" className="adm-deep scroll-mt-20 py-20 sm:py-28">
        <Wrap className="grid items-center gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20 xl:gap-28">
          <div className="adm-print mx-auto w-full max-w-[26rem] lg:max-w-none">
            <Image src="/images/shabari-portrait.jpg" alt="Shabari Shankar" width={700} height={875} sizes="(min-width: 1024px) 34vw, (min-width: 640px) 26rem, 90vw" className="block h-auto w-full" />
          </div>
          <div>
            <Label>Why trust me with your essays</Label>
            <h2 id="essays-h" className="mt-4 max-w-xl text-[clamp(2.2rem,3.8vw,3.4rem)]">
              Three MIT writing prizes, and a news editor’s desk at The Tech.
            </h2>
            <ul className="mt-12 border-t border-[color:var(--adm-rule-strong)]">
              {prizes.map((p) => (
                <li key={p.name} className="grid gap-1 border-b border-[color:var(--adm-rule-strong)] py-5 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6">
                  <p className="font-display text-[clamp(1.6rem,2.6vw,2.25rem)] leading-tight text-hema">{p.name}</p>
                  <p className="adm-caps text-quiet">{p.detail}</p>
                </li>
              ))}
            </ul>
            <div className="mt-10 grid gap-6">
              {otherWriting.map((w) => (
                <p key={w} className="adm-aside max-w-[62ch] text-[1.125rem] leading-relaxed text-specimen/90">
                  {w}
                </p>
              ))}
            </div>
          </div>
        </Wrap>
      </section>

      <section id="help" aria-labelledby="help-h" className="adm-paper scroll-mt-20 py-24 sm:py-32">
        <Wrap>
          <Label>What I help with</Label>
          <h2 id="help-h" className={cn(h2, "mt-4")}>
            The whole application, piece by piece.
          </h2>
          <div className="mt-14 sm:mt-20">
            <Journey stations={admissionsHelp} />
          </div>
          <div className="adm-card mt-16 rounded-[1.25rem] p-7 sm:mt-20 sm:p-10">
            <ol aria-label="When to start" className="grid gap-10 sm:grid-cols-2">
              {admissionsTimeline.map((t) => (
                <li key={t.when} className="adm-when">
                  <p className="text-[0.95rem] font-semibold text-quiet">{t.when}</p>
                  <p className="mt-1 font-display text-[2.1rem] leading-tight text-hema">{t.what}</p>
                </li>
              ))}
            </ol>
          </div>
          <p className="mt-5 text-sm text-quiet">When should high schoolers start? Junior year for planning; essays the summer before senior year.</p>
        </Wrap>
      </section>

      <section id="record" aria-labelledby="record-h" className="adm-deep scroll-mt-20 py-24 sm:py-32">
        <Wrap className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <Label>My high school record</Label>
            <h2 id="record-h" className={cn(h2, "mt-4")}>
              The record behind the admissions.
            </h2>
            <p className="mt-6 max-w-sm text-[1rem] leading-relaxed text-quiet">{highSchool.disclaimer}</p>
          </div>
          <div className="grid gap-14">
            <div className="adm-card rounded-[1.25rem] p-6 sm:p-10">
              <IbScores />
            </div>
            <p className="adm-aside font-display text-[1.55rem] leading-snug text-hema">{highSchool.extendedEssay}</p>
            <div>
              <h3 className="text-[1.6rem]">Activities</h3>
              <ul className="adm-ledger mt-5">
                {highSchool.activities.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </Wrap>
      </section>

      <section id="mentoring" aria-labelledby="mentoring-h" className="adm-paper scroll-mt-20 py-24 sm:py-32">
        <Wrap className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <Label>Experience mentoring students</Label>
            <h2 id="mentoring-h" className={cn(h2, "mt-4")}>
              Mentoring students through MIT programs.
            </h2>
          </div>
          <ul className="border-t border-[color:var(--adm-rule-strong)]">
            {mentoring.map((t) => (
              <li key={t} className="border-b border-[color:var(--adm-rule-strong)] py-5 text-[1.1875rem] leading-relaxed text-specimen/90">
                {t}
              </li>
            ))}
          </ul>
        </Wrap>
      </section>

      <section id="admissions-pricing" aria-labelledby="adm-pricing-h" className="adm-deep scroll-mt-20 py-24 sm:py-32">
        <Wrap>
          <Label>Admissions pricing</Label>
          <h2 id="adm-pricing-h" className={cn(h2, "mt-4")}>
            Every option starts with a free call.
          </h2>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {admissionsPricing.map((p, i) => (
              <div key={p.name} className={cn("flex flex-col rounded-[1.25rem] p-7 sm:p-8", i === 0 ? "adm-card-ink" : "adm-card")}>
                <h3 className={cn("text-[1.45rem]", i === 0 && "text-white")}>{p.name}</h3>
                <p className={cn("mt-4 font-display text-[1.9rem] leading-tight", i === 0 ? "text-white" : "text-hema")}>{p.price ?? "Priced on your consult call"}</p>
                {p.includes && <p className="mt-3 text-[1.0625rem] text-quiet">{p.includes}</p>}
              </div>
            ))}
          </div>
          <PaymentNote className="mt-8" />
        </Wrap>
      </section>

      <BookingBand service="admissions" />
      <Wrap className="py-8">
        <p className="text-sm text-quiet">Independent consulting. Not affiliated with or endorsed by MIT or any other university.</p>
      </Wrap>
    </div>
  );
}
