import { admittedLine, admittedTo, credibilityStrip, headline, identity, mcatScore } from "@/lib/founder-facts";
import { ButtonLink, Wrap } from "./primitives";
import { HeroMolecule } from "./hero-molecule";

const SECTION_ORDER = [
  { key: "BB", label: "B/B" },
  { key: "PS", label: "P/S" },
  { key: "CP", label: "C/P" },
] as const;

/** Section scores on their real 118–132 scale. */
function ScoreBars() {
  return (
    <ul aria-label="MCAT section scores" className="mt-6 grid gap-2.5">
      {SECTION_ORDER.map(({ key, label }) => {
        const v = mcatScore.sections[key];
        return (
          <li key={key} className="grid grid-cols-[2.75rem_1fr_2.25rem] items-center gap-3 text-sm">
            <span className="font-medium text-quiet">{label}</span>
            <span aria-hidden className="relative h-1.5 rounded-full bg-hairline">
              <span className="absolute inset-y-0 left-0 rounded-full bg-hema" style={{ width: `${((v - 118) / 14) * 100}%` }} />
            </span>
            <span className="text-right font-semibold tabular-nums text-hema">{v}</span>
          </li>
        );
      })}
    </ul>
  );
}

function SchoolTiles() {
  return (
    <ul aria-label="Admitted to" className="mt-6 grid grid-cols-3 gap-2">
      {admittedTo.map((s) => (
        <li key={s} className="rounded-lg border border-hairline bg-mist px-3 py-2 text-center text-[0.95rem] font-semibold text-hema">
          {s}
        </li>
      ))}
    </ul>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="hero-h" className="bg-white pb-0 pt-10 sm:pt-16">
      <Wrap>
        <div className="grid items-center gap-x-14 gap-y-8 lg:grid-cols-[1.12fr_0.88fr]">
          <div>
            <p className="text-[0.98rem] font-semibold text-eosin">
              {identity.classOf}, {identity.track}
            </p>
            <h1 id="hero-h" className="mt-4 text-[clamp(2.35rem,4.3vw,4rem)] leading-[1.03]">
              {headline}
            </h1>
            <p className="mt-6 max-w-[38rem] text-[1.125rem] leading-relaxed text-quiet">
              Shabari Shankar, {identity.degree}. MCAT prep and college admissions consulting, one on one.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/book">Book a free 15-min call</ButtonLink>
              <ButtonLink href="/practice" variant="secondary">
                Free practice test
              </ButtonLink>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[34rem] lg:max-w-none">
            <HeroMolecule />
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <article aria-labelledby="panel-mcat" className="flex flex-col rounded-2xl border border-hairline bg-white p-7 sm:p-9">
            <h2 id="panel-mcat" className="text-[1.0625rem] font-semibold text-eosin">
              MCAT Prep
            </h2>
            <p className="mt-3 text-[clamp(1.6rem,2.4vw,2.1rem)] font-bold leading-tight tracking-[-0.02em] text-hema">{mcatScore.line}</p>
            <ScoreBars />
            <div className="mt-auto pt-8">
              <ButtonLink href="/mcat">Explore MCAT Prep</ButtonLink>
            </div>
          </article>
          <article aria-labelledby="panel-admissions" className="flex flex-col rounded-2xl border border-hairline bg-white p-7 sm:p-9">
            <h2 id="panel-admissions" className="text-[1.0625rem] font-semibold text-eosin">
              College Admissions
            </h2>
            <p className="mt-3 text-[clamp(1.6rem,2.4vw,2.1rem)] font-bold leading-tight tracking-[-0.02em] text-hema">{admittedLine}</p>
            <SchoolTiles />
            <div className="mt-auto pt-8">
              <ButtonLink href="/admissions">Explore Admissions Consulting</ButtonLink>
            </div>
          </article>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <ButtonLink href="/book">Book a free 15-min call</ButtonLink>
          <p className="text-[0.98rem] text-quiet">Fifteen minutes on Zoom, for MCAT or college admissions.</p>
        </div>
      </Wrap>

      <div className="mt-16 border-y border-hairline bg-mist">
        <Wrap>
          <ul aria-label="Credentials" className="flex flex-wrap items-center justify-center gap-x-0 gap-y-3 py-5">
            {credibilityStrip.map((c, i) => (
              <li key={c} className={`px-5 text-[0.98rem] font-semibold text-hema sm:px-7 ${i > 0 ? "sm:border-l sm:border-hairline" : ""}`}>
                {c}
              </li>
            ))}
          </ul>
        </Wrap>
      </div>
    </section>
  );
}
