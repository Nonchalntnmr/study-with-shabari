import type { Metadata } from "next";
import { HeroMolecule } from "@/components/b/hero-molecule";
import { Band, ButtonLink, H2, Kicker, Wrap } from "@/components/b/primitives";
import { DopamineQuiz } from "@/components/lesson/dopamine-quiz";
import { publicQuestions } from "@/lib/lessons/dopamine-page";

// Shabari's free lesson, as she wrote it (docs/FOUNDER-SPEC.md, founder update 2026-10-30, section 5).
const TITLE = "Dopamine: One Molecule, Every MCAT Section";

export const metadata: Metadata = {
  title: TITLE,
  description: "A free MCAT lesson on dopamine: structure and charge, synthesis, clearance, receptors, the four pathways, clinical connections and reward prediction error, with six practice questions.",
  alternates: { canonical: "/dopamine" },
};

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`s${n}`} className="border-t border-hairline py-12">
      <h2 id={`s${n}`} className="text-[clamp(1.6rem,2.6vw,2.2rem)]">
        <span className="mr-3 font-sans text-[1rem] font-semibold text-eosin">{n}</span>
        {title}
      </h2>
      <div className="mt-5 max-w-[68ch] space-y-4 text-[1.125rem] leading-relaxed text-specimen/90">{children}</div>
    </section>
  );
}

export default function DopamineLessonPage() {
  return (
    <>
      <section aria-labelledby="lesson-h" className="bg-white pb-6 pt-10 sm:pt-16">
        <Wrap className="grid items-center gap-x-16 gap-y-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <Kicker>Free MCAT lesson</Kicker>
            <h1 id="lesson-h" className="mt-4 text-[clamp(2.35rem,4.2vw,3.9rem)] leading-[1.04]">
              {TITLE}
            </h1>
            <p className="mt-5 text-[1.0625rem] text-quiet">Written by Shabari.</p>
          </div>
          <div className="mx-auto w-full max-w-[32rem] lg:max-w-none">
            <HeroMolecule />
          </div>
        </Wrap>
      </section>

      <Wrap className="pb-8">
        <Section n={1} title="What it is">
          <p>
            Dopamine (C₈H₁₁NO₂) is a catecholamine: a catechol ring (benzene with two adjacent –OH groups) attached to an ethylamine side chain.
            It’s a neurotransmitter and the precursor to norepinephrine and epinephrine. Dopamine itself is achiral. Its amine (pKa ≈ 10) is
            protonated at physiological pH, so it carries a +1 charge and can’t cross the blood–brain barrier.
          </p>
        </Section>

        <Section n={2} title="How it’s made (catecholamine synthesis)">
          <ol className="grid gap-2">
            <li>Tyrosine → L-DOPA (tyrosine hydroxylase; rate-limiting; needs BH4)</li>
            <li>→ dopamine (aromatic L-amino acid decarboxylase; needs vitamin B6/PLP)</li>
            <li>→ norepinephrine (dopamine β-hydroxylase; needs vitamin C and copper; inside vesicles)</li>
            <li>→ epinephrine (PNMT; uses SAM as a methyl donor; mainly in the adrenal medulla)</li>
          </ol>
        </Section>

        <Section n={3} title="How it’s cleared">
          <p>Reuptake by the dopamine transporter (DAT), then breakdown by MAO and COMT. The main metabolite is homovanillic acid (HVA).</p>
        </Section>

        <Section n={4} title="Receptors">
          <ul className="grid gap-2">
            <li>D1-like (D1, D5): Gs-coupled → ↑ adenylyl cyclase → ↑ cAMP.</li>
            <li>D2-like (D2, D3, D4): Gi-coupled → ↓ cAMP.</li>
          </ul>
        </Section>

        <Section n={5} title="The four pathways">
          <ul className="grid gap-3">
            <li>
              <strong className="text-hema">Nigrostriatal:</strong> substantia nigra → striatum. Movement. Lost in Parkinson’s disease.
            </li>
            <li>
              <strong className="text-hema">Mesolimbic:</strong> ventral tegmental area (VTA) → nucleus accumbens. Reward and reinforcement;
              addiction. Overactivity linked to positive symptoms of schizophrenia.
            </li>
            <li>
              <strong className="text-hema">Mesocortical:</strong> VTA → prefrontal cortex. Motivation and executive function; underactivity linked
              to negative symptoms.
            </li>
            <li>
              <strong className="text-hema">Tuberoinfundibular:</strong> hypothalamus → pituitary. Dopamine inhibits prolactin release.
            </li>
          </ul>
        </Section>

        <Section n={6} title="Clinical connections">
          <ul className="grid gap-3">
            <li>
              Parkinson’s: patients get L-DOPA, not dopamine, because L-DOPA crosses the blood–brain barrier via amino acid transporters.
              Carbidopa blocks peripheral decarboxylation and doesn’t enter the brain, so more L-DOPA reaches it.
            </li>
            <li>
              Antipsychotics block D2 receptors: blocking nigrostriatal D2 causes movement side effects; blocking tuberoinfundibular D2 raises
              prolactin.
            </li>
            <li>
              Cocaine blocks DAT; amphetamine reverses DAT and releases dopamine. Both raise synaptic dopamine in the mesolimbic pathway.
            </li>
          </ul>
        </Section>

        <Section n={7} title="Psych/Soc connection: reward prediction error">
          <p>
            Dopamine neurons fire for an unexpected reward. Once a cue predicts the reward, they fire at the cue instead. If an expected reward
            doesn’t come, firing dips below baseline. This is how dopamine teaches the brain what to expect, and it links to operant
            conditioning and addiction.
          </p>
        </Section>

        <section aria-labelledby="s8" className="border-t border-hairline py-12">
          <h2 id="s8" className="text-[clamp(1.6rem,2.6vw,2.2rem)]">
            <span className="mr-3 font-sans text-[1rem] font-semibold text-eosin">8</span>
            Practice questions
          </h2>
          <p className="mt-4 text-[1.0625rem] text-quiet">Pick an answer to see the explanation.</p>
          <DopamineQuiz questions={publicQuestions()} />
        </section>
      </Wrap>

      <Band tone="mist" labelledBy="deeper-h">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <H2 id="deeper-h">Want to go deeper? Book a free 15-minute call.</H2>
          <ButtonLink href="/book?service=mcat">Book a free 15-min call</ButtonLink>
        </div>
      </Band>
    </>
  );
}
