import { admittedLine, credibilityStrip, headline, heroEyebrow, heroSubline, mcatScore } from "@/lib/founder-facts";
import { consultPlatform } from "@/lib/site";
import { ButtonLink, TextLink, Wrap } from "./primitives";
import { HeroMolecule } from "./hero-molecule";

const SECTION_ORDER = [
  { key: "BB", label: "B/B" },
  { key: "PS", label: "P/S" },
  { key: "CP", label: "C/P" },
] as const;

/** Section scores on their real 118–132 scale. */
function ScoreBars() {
  return (
    <ul aria-label="MCAT section scores" className="mt-7 grid max-w-md gap-3">
      {SECTION_ORDER.map(({ key, label }) => {
        const v = mcatScore.sections[key];
        return (
          <li key={key} className="grid grid-cols-[2.75rem_1fr_2.5rem] items-center gap-4 text-sm">
            <span className="font-medium text-quiet">{label}</span>
            <span aria-hidden className="relative h-[3px] rounded-full bg-hairline">
              <span className="absolute inset-y-0 left-0 rounded-full bg-hema" style={{ width: `${((v - 118) / 14) * 100}%` }} />
            </span>
            <span className="text-right font-display text-[1.25rem] leading-none text-hema">{v}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="hero-h" className="bg-white pt-12 sm:pt-20">
      <Wrap>
        <div className="grid items-center gap-x-16 gap-y-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-[0.98rem] font-medium text-quiet">{heroEyebrow}</p>
            <h1 id="hero-h" className="mt-5 text-[clamp(2.6rem,5vw,4.6rem)] leading-[1.02]">
              {headline}
            </h1>
            <p className="mt-7 max-w-[36rem] text-[1.125rem] leading-relaxed text-quiet">{heroSubline}</p>
            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
              <ButtonLink href="/book">Book a free 15-min call</ButtonLink>
              <TextLink href="/mcat">Explore MCAT tutoring</TextLink>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[32rem] lg:max-w-none">
            <HeroMolecule />
          </div>
        </div>

        <div className="mt-20 grid border-t border-hairline md:grid-cols-2">
          <article aria-labelledby="panel-mcat" className="flex flex-col py-10 md:pr-14">
            <h2 id="panel-mcat" className="font-sans text-[0.98rem] font-semibold tracking-normal text-eosin">
              MCAT Prep
            </h2>
            <p className="mt-4 font-display text-[clamp(1.75rem,2.6vw,2.4rem)] leading-[1.1] text-hema">{mcatScore.line}</p>
            <ScoreBars />
            <div className="mt-auto pt-9">
              <TextLink href="/mcat">Explore MCAT Prep</TextLink>
            </div>
          </article>
          <article aria-labelledby="panel-admissions" className="flex flex-col border-t border-hairline py-10 md:border-l md:border-t-0 md:pl-14">
            <h2 id="panel-admissions" className="font-sans text-[0.98rem] font-semibold tracking-normal text-eosin">
              College Admissions
            </h2>
            <p className="mt-4 max-w-xl font-display text-[clamp(1.75rem,2.6vw,2.4rem)] leading-[1.12] text-hema">{admittedLine}</p>
            <div className="mt-auto pt-9">
              <TextLink href="/admissions">Explore Admissions Consulting</TextLink>
            </div>
          </article>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-hairline py-10">
          <ButtonLink href="/book">Book a free 15-min call</ButtonLink>
          <p className="text-[0.98rem] text-quiet">Fifteen minutes{consultPlatform ? ` on ${consultPlatform}` : ""}, for MCAT or college admissions.</p>
        </div>
      </Wrap>

      <div className="border-y border-hairline bg-mist">
        <Wrap>
          <ul aria-label="Credentials" className="flex flex-wrap items-center justify-center gap-y-3 py-6">
            {credibilityStrip.map((c, i) => (
              <li key={c} className={`px-5 font-display text-[1.15rem] text-hema sm:px-8 ${i > 0 ? "sm:border-l sm:border-hairline" : ""}`}>
                {c}
              </li>
            ))}
          </ul>
        </Wrap>
      </div>
    </section>
  );
}
