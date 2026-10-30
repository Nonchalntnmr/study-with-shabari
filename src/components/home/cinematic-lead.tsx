import { ButtonLink, TextLink } from "@/components/b/primitives";
import { credibilityStrip, headline, heroEyebrow, heroSubline, scholarshipAdmissionsLine } from "@/lib/founder-facts";
import { MOLECULES } from "@/lib/molecules/analyze";
import { DOPAMINE, subscriptFormula } from "@/lib/experience/structure";

// The home hero, as the founder approved it (founder-facts: eyebrow, headline, subline, the two
// CTAs, the lesson link and the credibility strip), laid over the Specimen's first beat on
// desktop and above the stage on a phone. The placard is the specimen's museum label.

const dopamine = MOLECULES.dopamine;

export function CinematicLead() {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-5 pb-8 pt-8 sm:px-8 md:py-10">
      <div className="max-w-[min(34rem,42vw)] max-md:max-w-none">
        <p className="text-[0.98rem] font-medium text-quiet">{heroEyebrow}</p>
        <h1 id="hero-h" data-step-heading tabIndex={-1} className="mt-4 text-[clamp(2.2rem,3.7vw,3.6rem)] leading-[1.03] outline-none sm:mt-5">
          {headline}
        </h1>
        <p className="mt-5 text-[1.125rem] leading-relaxed text-quiet sm:mt-6">{heroSubline}</p>
        <div id="hero-ctas" className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4">
          <ButtonLink href="/book">Book a free consult call</ButtonLink>
          <TextLink href="/mcat">Explore MCAT tutoring</TextLink>
        </div>
        <TextLink href="/dopamine" className="mt-5">
          Explore the free dopamine lesson
        </TextLink>
        <p className="mt-6 border-t border-[color:var(--exp-rule)] pt-4 text-[0.98rem] font-medium leading-relaxed text-hema">
          {scholarshipAdmissionsLine}
        </p>
        <ul aria-label="Credentials" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-[color:var(--exp-rule)] pt-5">
          {credibilityStrip.map((c) => (
            <li key={c} className="font-display text-[1.05rem] text-hema">
              {c}
            </li>
          ))}
        </ul>
      </div>
      <dl
        aria-label="The specimen"
        className="mt-8 max-w-sm rounded-xl border border-[color:var(--exp-rule)] bg-[#FFFDF8]/90 p-4 text-[0.85rem] md:absolute md:bottom-24 md:right-[7%] md:mt-0 md:w-[17rem]"
      >
        <dt className="exp-label-caps text-[color:var(--exp-quiet)]">Specimen</dt>
        <dd className="mt-1 font-display text-[1.2rem] text-hema">Dopamine, {subscriptFormula(DOPAMINE.neutralFormula)}</dd>
        <dt className="sr-only">Molar mass</dt>
        <dd className="mt-1 text-specimen/85">{dopamine.molecularWeight} g/mol</dd>
        <dt className="sr-only">Source</dt>
        <dd className="text-specimen/85">Atom positions from PubChem’s 3D conformer (CID {dopamine.cid})</dd>
      </dl>
    </div>
  );
}
