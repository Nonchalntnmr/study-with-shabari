import Image from "next/image";
import { Skeletal } from "@/components/molecule/skeletal";
import { AMINE_PKA, DOPAMINE, PHYSIOLOGICAL_PH, fractionProtonated, subscriptFormula } from "@/lib/experience/structure";
import { MOLECULES } from "@/lib/molecules/analyze";
import { BookLink, SecondaryLink } from "../chrome";
import { Panel, type StepContent } from "../scroll-story";
import { StillFrame } from "../stills";
import { ExplodedFigure, ExplodedLegend } from "./exploded-figure";

// The Specimen's words and stills. Scientific text is Shabari's, from her dopamine lesson
// (src/app/(site)/dopamine/page.tsx); numbers on the specimen label come from PubChem's record
// (src/content/molecules/dopamine.json) or are computed from it.

const dopamine = MOLECULES.dopamine;
export const LESSON_TITLE = "Dopamine: One Molecule, Every MCAT Section";
const pct = (fractionProtonated(PHYSIOLOGICAL_PH, AMINE_PKA) * 100).toFixed(1);

export function SpecimenLabel() {
  const rows: [string, string][] = [
    ["Formula", subscriptFormula(DOPAMINE.neutralFormula)],
    ["Molar mass", `${dopamine.molecularWeight} g/mol`],
    ["IUPAC name", dopamine.iupacName],
    ["Coordinates", `PubChem CID ${dopamine.cid}, computed 3D conformer`],
  ];
  return (
    <>
    <p className="text-[0.9rem] text-[color:var(--exp-quiet)] md:hidden">
      {rows[0][1]} · {rows[1][1]} · PubChem CID {dopamine.cid}
    </p>
    <dl className="mt-6 hidden gap-x-6 gap-y-2 border-t border-[color:var(--exp-rule)] pt-4 text-[0.9rem] md:grid md:grid-cols-[auto_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="exp-label-caps pt-[0.15rem] text-[color:var(--exp-quiet)]">{k}</dt>
          <dd className="text-specimen">{v}</dd>
        </div>
      ))}
    </dl>
    </>
  );
}

// The stage's still is the hero's first paint (and on phones its LCP), so it is the one high-priority
// image; the reduced-motion copy further down loads normally.
const poster = (
  <Image src="/images/dopamine-model-tight.png" alt="" width={918} height={727} priority sizes="(min-width: 768px) 38rem, 22rem" className="h-auto w-full" />
);
const posterInline = <Image src="/images/dopamine-model-tight.png" alt="" width={918} height={727} sizes="(min-width: 768px) 38rem, 22rem" className="mx-auto h-auto w-full max-w-md" />;

export function specimenStills(): React.ReactNode[] {
  return [
    <StillFrame key="0">{poster}</StillFrame>,
    <StillFrame key="1">
      <Skeletal molecule={dopamine} title="Skeletal structure of dopamine" className="mx-auto w-[70%]" />
    </StillFrame>,
    <StillFrame key="2">
      <ExplodedFigure protonated={false} title="Dopamine taken apart into its benzene ring, two hydroxyls and ethylamine side chain" className="w-full" />
    </StillFrame>,
    <StillFrame key="3">
      <ExplodedFigure title="Dopamine taken apart, with the amine protonated to –NH₃⁺" className="w-full" />
    </StillFrame>,
    <StillFrame key="4">
      <ExplodedFigure achiral title="Dopamine taken apart, its two CH₂ carbons highlighted" className="w-full" />
    </StillFrame>,
    <StillFrame key="5">
      <ExplodedFigure assembled title="Dopamine at pH 7.4, with its protonated amine" className="mx-auto w-[80%]" />
    </StillFrame>,
  ];
}

/** The six beats. `heroLevel` is 1 on the Specimen page and 2 where it opens a longer page. */
export function specimenSteps({ heroLevel = 1 as 1 | 2, heroExtra }: { heroLevel?: 1 | 2; heroExtra?: React.ReactNode } = {}): StepContent[] {
  return [
    {
      id: "hero",
      nav: "the specimen",
      panel: (
        <Panel kicker="Specimen · PubChem CID 681" title="Dopamine" level={heroLevel}>
          <p>{LESSON_TITLE}. A free lesson written by Shabari.</p>
          <SpecimenLabel />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-3">
            <BookLink />
            <SecondaryLink href="/dopamine">Read the free lesson</SecondaryLink>
          </div>
          {heroExtra}
        </Panel>
      ),
      figure: posterInline,
    },
    {
      id: "closer",
      nav: "what it is",
      panel: (
        <Panel kicker="1 · What it is" title="A catecholamine">
          <p>
            Dopamine (C₈H₁₁NO₂) is a catecholamine: a catechol ring (benzene with two adjacent –OH groups) attached to an ethylamine side chain. It’s a
            neurotransmitter and the precursor to norepinephrine and epinephrine.
          </p>
        </Panel>
      ),
      figure: <Skeletal molecule={dopamine} title="Skeletal structure of dopamine" className="mx-auto w-full max-w-sm" />,
    },
    {
      id: "exploded",
      nav: "its four parts",
      panel: (
        <Panel kicker="Exploded view" title="Four parts, one molecule">
          <ExplodedLegend />
          <p className="text-[0.95rem] text-[color:var(--exp-quiet)]">Each part moves out along the bond that joins it to the ring. Dashed lines are the broken bonds.</p>
        </Panel>
      ),
      figure: <ExplodedFigure protonated={false} title="Dopamine taken apart into its benzene ring, two hydroxyls and ethylamine side chain" className="w-full" />,
    },
    {
      id: "proton",
      nav: "the charge at pH 7.4",
      panel: (
        <Panel kicker="At pH 7.4" title="A proton on the amine">
          <p>
            Its amine (pKa ≈ 10) is protonated at physiological pH, so it carries a +1 charge and can’t cross the blood–brain barrier.
          </p>
          <p className="text-[0.95rem] text-[color:var(--exp-quiet)]">
            At pH {PHYSIOLOGICAL_PH} with pKa {AMINE_PKA}, about {pct}% of the amine is protonated: 1 / (1 + 10<sup>pH − pKa</sup>).
          </p>
        </Panel>
      ),
      figure: <ExplodedFigure title="Dopamine taken apart, with the amine protonated to –NH₃⁺" className="w-full" />,
    },
    {
      id: "achiral",
      nav: "why it is achiral",
      panel: (
        <Panel kicker="Stereochemistry" title="Achiral">
          <p>Dopamine itself is achiral.</p>
          <p className="text-[0.95rem] text-[color:var(--exp-quiet)]">
            A stereocenter needs a carbon with four different groups. Both side-chain carbons are CH₂, and the ring carbons have only three neighbours, so there is none.
          </p>
        </Panel>
      ),
      figure: <ExplodedFigure achiral title="Dopamine taken apart, its two CH₂ carbons highlighted" className="w-full" />,
    },
    {
      id: "whole",
      nav: "the whole molecule",
      panel: (
        <Panel kicker="Put back together" title="One molecule, every MCAT section">
          <p>The rest of the lesson follows this molecule through:</p>
          <ul className="grid gap-1 text-[0.98rem]">
            {["How it’s made (catecholamine synthesis)", "How it’s cleared", "Receptors", "The four pathways", "Clinical connections", "Psych/Soc connection: reward prediction error"].map((t) => (
              <li key={t} className="border-b border-[color:var(--exp-rule)] pb-1">
                {t}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-3">
            <BookLink />
            <SecondaryLink href="/dopamine">Read the free lesson</SecondaryLink>
          </div>
        </Panel>
      ),
      figure: <ExplodedFigure assembled title="Dopamine at pH 7.4, with its protonated amine" className="mx-auto w-full max-w-sm" />,
    },
  ];
}
