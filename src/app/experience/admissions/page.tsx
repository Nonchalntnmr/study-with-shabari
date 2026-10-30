import type { Metadata } from "next";
import { Journey, type Station } from "@/components/experience/admissions/journey";
import { BookLink, SecondaryLink } from "@/components/experience/chrome";
import { gateExperience } from "@/lib/experience/gate";
import { admissionsHeadline, admissionsHelp, admissionsTimeline, admittedLine, faq, highSchool } from "@/lib/founder-facts";

// Admissions in a warm editorial world: paper made in CSS, serif, navy. The journey's words are
// founder-facts (admissionsHelp, admissionsTimeline, the FAQ). No outcome promises: her own
// results appear once, with her disclaimer beside them.

export const instant = false;
export const metadata: Metadata = { title: "Admissions", description: "Prototype: the college application as a journey, from essays to timeline." };

const NUMERALS = ["I", "II", "III", "IV", "V", "VI"];
const faqA = (q: string) => faq.find((f) => f.q === q)?.a;

export default function AdmissionsPrototype() {
  gateExperience();
  const stations: Station[] = admissionsHelp.map((h, i) => ({
    id: h.title.toLowerCase().replace(/[^a-z]+/g, "-"),
    numeral: NUMERALS[i],
    title: h.title,
    body: h.body + ".",
    detail:
      h.title === "Timeline"
        ? admissionsTimeline.map((t) => ({ label: t.when, text: t.what }))
        : undefined,
  }));
  const start = faqA("When should high schoolers start college apps?");
  const parents = faqA("Can parents join calls?");
  return (
    <div className="exp-paper">
      <section aria-labelledby="adm-h" className="mx-auto max-w-[1440px] px-4 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-24">
        <p className="exp-label-caps text-[color:var(--exp-quiet)]">College admissions · prototype</p>
        <h1 id="adm-h" className="mt-5 max-w-5xl text-[clamp(2.6rem,6.2vw,5.6rem)] leading-[0.98]">
          {admissionsHeadline}
        </h1>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <BookLink href="/book?service=admissions" />
          <SecondaryLink href="/admissions">Explore admissions help</SecondaryLink>
        </div>
      </section>

      <section aria-labelledby="journey-h" className="mx-auto max-w-[1440px] px-4 pb-20 sm:px-8 sm:pb-28">
        <div className="flex flex-wrap items-end justify-between gap-6 border-t border-hema/20 pt-10">
          <h2 id="journey-h" className="text-[clamp(2rem,3.6vw,3.2rem)]">
            The application, station by station
          </h2>
          <p className="max-w-md text-[1.0625rem] text-[color:var(--exp-quiet)]">Choose a station, or use the arrow keys.</p>
        </div>
        <div className="mt-12">
          <Journey stations={stations} />
        </div>
      </section>

      <section aria-labelledby="when-h" className="border-y border-hema/15 bg-[#FBF7EE]/70">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-16 sm:px-8 md:grid-cols-2 md:py-20">
          <div>
            <h2 id="when-h" className="text-[clamp(1.8rem,3vw,2.5rem)]">
              When to start
            </h2>
            {start && <p className="mt-4 max-w-md font-display text-[1.6rem] leading-snug text-hema">{start}</p>}
            {parents && <p className="mt-6 text-[1.0625rem] text-specimen/90">Can parents join calls? {parents}</p>}
          </div>
          <div>
            <h2 className="text-[clamp(1.8rem,3vw,2.5rem)]">Her own application</h2>
            <p className="mt-4 text-[1.125rem] leading-relaxed text-specimen/90">{admittedLine}.</p>
            <p className="mt-3 text-[0.98rem] text-[color:var(--exp-quiet)]">{highSchool.disclaimer}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="adm-book-h" className="mx-auto flex max-w-[1440px] flex-col items-start gap-8 px-4 py-20 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <h2 id="adm-book-h" className="max-w-2xl text-[clamp(2rem,3.4vw,3rem)]">
          Start with a free consult call.
        </h2>
        <BookLink href="/book?service=admissions" />
      </section>
    </div>
  );
}
