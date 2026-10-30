import Image from "next/image";
import Link from "next/link";
import { PlanCards } from "@/components/site/plan-cards";
import { founder, sessionPlatform } from "@/lib/site";
import { FounderPortrait } from "./founder-portrait";
import { ScoreInstrument } from "./score-instrument";

export function PrimaryCta({ href = "/book", children = "Book a free 15-min call" }: { href?: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-12 items-center rounded-full bg-eosin px-6 text-[1rem] font-semibold text-white transition-colors hover:bg-eosin-ink">
      {children}
    </Link>
  );
}
export function SecondaryCta({ href = "/practice", children = "Try a free practice set" }: { href?: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-12 items-center rounded-full px-6 text-[1rem] font-medium text-hema ring-1 ring-hema/30 transition hover:ring-hema">
      {children}
    </Link>
  );
}

const HELP = [
  { href: "/mcat-tutoring", title: "One-on-one MCAT tutoring", line: `Live ${sessionPlatform} sessions on Chem/Phys, Bio/Biochem and Psych/Soc, built around your test date.` },
  { href: "/practice", title: "Free practice sets", line: "Original passage-based questions in a test-day interface, with an explanation for every answer." },
  { href: "/resources", title: "Free study notes", line: "The content-review notes I made while studying, one per section." },
  { href: "/admissions", title: "Application help", line: "Help with the application side, scoped together on a free call." },
];

export function HowIHelp() {
  return (
    <section aria-labelledby="help-h" className="mx-auto max-w-[1400px] px-5 py-28 sm:px-8 sm:py-40">
      <h2 id="help-h" className="max-w-3xl text-[clamp(2.5rem,5vw,4.5rem)]">
        How I can help
      </h2>
      <ol className="mt-14 border-t border-hema/20">
        {HELP.map((h) => (
          <li key={h.href} className="border-b border-hema/20">
            <Link href={h.href} className="group grid gap-2 py-8 sm:grid-cols-[1fr_1.1fr] sm:items-baseline sm:gap-8 sm:py-10">
              <span className="font-display text-[clamp(1.9rem,3.4vw,3rem)] leading-[1.05] text-hema transition-colors group-hover:text-eosin-ink">{h.title}</span>
              <span className="text-[1.0625rem] text-specimen/80">{h.line}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TheScore() {
  return (
    <section aria-labelledby="score-h" className="flex min-h-[90svh] items-center border-y border-hairline bg-mist">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-24 sm:px-8">
        <h2 id="score-h" className="sr-only">
          My MCAT score
        </h2>
        <ScoreInstrument total={founder.mcat.total} sections={founder.mcat.sections} taken={founder.mcat.taken} />
      </div>
    </section>
  );
}

export function Founder() {
  return (
    <section aria-labelledby="founder-h" className="mx-auto grid max-w-[1400px] items-center gap-14 px-5 py-28 sm:px-8 sm:py-40 lg:grid-cols-[1fr_1.05fr] lg:gap-24">
      <FounderPortrait>
        <Image
          src="/images/shabari-portrait.jpg"
          alt="Shabari Shankar"
          width={700}
          height={875}
          sizes="(min-width: 1024px) 40vw, 90vw"
          className="h-auto w-full rounded-[28px]"
        />
      </FounderPortrait>
      <div>
        <h2 id="founder-h" className="text-[clamp(2.75rem,5vw,4.5rem)]">
          Hi, I’m Shabari.
        </h2>
        <div className="mt-8 max-w-[62ch] space-y-5 text-[1.125rem] leading-relaxed text-specimen/90">
          <p>
            I’m {founder.standing}, double majoring in {founder.majors}, and I’m headed to {founder.goal}.
          </p>
          <p>
            Studying for the MCAT taught me that content is only half of it: the other half is learning how the test asks questions. That’s what I
            focus on with students, and why I write my own practice questions instead of recycling the same third-party banks.
          </p>
        </div>
        <ul className="mt-10 grid gap-x-10 gap-y-4 border-t border-hairline pt-8 sm:grid-cols-2">
          <li>
            <p className="font-display text-2xl text-hema">MCAT {founder.mcat.total}</p>
            <p className="text-sm text-quiet">
              {founder.mcat.taken}: Chem/Phys {founder.mcat.sections.CP}, Bio/Biochem {founder.mcat.sections.BB}, Psych/Soc {founder.mcat.sections.PS}
            </p>
          </li>
          {founder.experience.map((e) => (
            <li key={e} className="text-[1.0625rem] text-specimen/90">
              {e}
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <PrimaryCta />
          <p className="text-sm text-quiet">Independent tutoring. Not affiliated with MIT.</p>
        </div>
      </div>
    </section>
  );
}

export function PricingTeaser() {
  return (
    <section aria-labelledby="pricing-h" className="border-t border-hairline bg-mist">
      <div className="mx-auto max-w-[1400px] px-5 py-28 sm:px-8 sm:py-36">
        <h2 id="pricing-h" className="max-w-3xl text-[clamp(2.5rem,5vw,4.5rem)]">
          Every option starts with a free call.
        </h2>
        <div className="mt-14">
          <PlanCards />
        </div>
        <p className="mt-10 max-w-2xl text-quiet">
          Payment is by Zelle, arranged after your consultation. There’s no card checkout on this site.
        </p>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="mx-auto flex min-h-[70svh] max-w-[1400px] flex-col items-start justify-center px-5 py-28 sm:px-8">
      <h2 className="max-w-4xl text-[clamp(2.75rem,6vw,5.5rem)]">Not sure where to start? Start with fifteen minutes.</h2>
      <p className="mt-6 max-w-2xl text-[1.125rem] text-specimen/85">
        We’ll look at your timeline and scores, and you’ll leave with a next step whether or not we work together.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <PrimaryCta />
        <SecondaryCta />
      </div>
    </section>
  );
}
