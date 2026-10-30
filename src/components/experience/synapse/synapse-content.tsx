import Image from "next/image";
import { BookLink, SecondaryLink } from "../chrome";
import { Panel, type StepContent } from "../scroll-story";
import { StillFrame } from "../stills";
import { SynapseFigure } from "./synapse-figure";

// The Synapse's words and stills. Every sentence is Shabari's, from her dopamine lesson
// (src/app/(site)/dopamine/page.tsx): how it's made, the receptors, how it's cleared, and the
// clinical line about DAT. The scene plays release and diffusion between those beats without
// captions, so nothing here is new educational copy.

const LESSON_TITLE = "Dopamine: One Molecule, Every MCAT Section";

/** Scene phase (src/lib/experience/synapse-choreography.ts) at each beat, and its figure's description. */
const BEAT = {
  molecule: { phase: 0, title: "The dopamine molecule" },
  made: { phase: 1, title: "Synapse diagram: vesicles of dopamine in the presynaptic terminal" },
  receptors: { phase: 4, title: "Synapse diagram: dopamine at D1 and D2 receptors, with cAMP up beside D1 and down beside D2" },
  cleared: { phase: 5, title: "Synapse diagram: dopamine returning through the dopamine transporter" },
  whole: { phase: 6, title: "Synapse diagram: the whole synapse" },
} as const;
type BeatId = keyof typeof BEAT;

export const SCALE_NOTE = "Stylized and not to scale.";

const still = (id: BeatId, datBlocked: boolean, priority: boolean) =>
  id === "molecule" ? (
    <Image src="/images/dopamine-model-tight.png" alt="" width={918} height={727} priority={priority} sizes="(min-width: 768px) 38rem, 22rem" className="h-auto w-full" />
  ) : (
    <SynapseFigure beat={BEAT[id].phase} datBlocked={datBlocked} title={BEAT[id].title} uid="s" className="w-full" />
  );

const figure = (id: BeatId, datBlocked = false) =>
  id === "molecule" ? (
    <Image src="/images/dopamine-model-tight.png" alt="" width={918} height={727} sizes="(min-width: 768px) 38rem, 22rem" className="mx-auto h-auto w-full max-w-md" />
  ) : (
    <SynapseFigure beat={BEAT[id].phase} datBlocked={datBlocked} title={BEAT[id].title} uid={datBlocked ? "i" : ""} className="w-full" />
  );

/** Her synthesis list, section 2 of the lesson, verbatim. */
function HowItsMade() {
  return (
    <ol className="grid gap-1.5">
      <li>Tyrosine → L-DOPA (tyrosine hydroxylase; rate-limiting; needs BH4)</li>
      <li>→ dopamine (aromatic L-amino acid decarboxylase; needs vitamin B6/PLP)</li>
      <li>→ norepinephrine (dopamine β-hydroxylase; needs vitamin C and copper; inside vesicles)</li>
      <li>→ epinephrine (PNMT; uses SAM as a methyl donor; mainly in the adrenal medulla)</li>
    </ol>
  );
}

function step(id: BeatId, heroLevel: 1 | 2): StepContent {
  switch (id) {
    case "molecule":
      return {
        id,
        nav: "the molecule",
        panel: (
          <Panel kicker="Synapse" title="Dopamine" level={heroLevel}>
            <p>{LESSON_TITLE}. A free lesson written by Shabari.</p>
            <p>It’s a neurotransmitter and the precursor to norepinephrine and epinephrine.</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-3">
              <BookLink />
              <SecondaryLink href="/dopamine">Read the free lesson</SecondaryLink>
            </div>
          </Panel>
        ),
        figure: figure(id),
      };
    case "made":
      return {
        id,
        nav: "how it’s made",
        panel: (
          <Panel kicker="Synapse" title="How it’s made (catecholamine synthesis)">
            <HowItsMade />
          </Panel>
        ),
        figure: figure(id),
      };
    case "receptors":
      return {
        id,
        nav: "receptors",
        panel: (
          <Panel kicker="Synapse" title="Receptors">
            <ul className="grid gap-2">
              <li>
                <span className="font-semibold text-[#4B33B5]">D1-like</span> (D1, D5): Gs-coupled → ↑ adenylyl cyclase → ↑ cAMP.
              </li>
              <li>
                <span className="font-semibold text-[#0B6E6A]">D2-like</span> (D2, D3, D4): Gi-coupled → ↓ cAMP.
              </li>
            </ul>
            <p className="text-[0.9rem] text-[color:var(--exp-quiet)]">{SCALE_NOTE}</p>
          </Panel>
        ),
        figure: figure(id),
      };
    case "cleared":
      return {
        id,
        nav: "how it’s cleared",
        panel: (
          <Panel kicker="Synapse" title="How it’s cleared">
            <p>Reuptake by the dopamine transporter (DAT), then breakdown by MAO and COMT. The main metabolite is homovanillic acid (HVA).</p>
          </Panel>
        ),
        figure: figure(id),
      };
    case "whole":
      return {
        id,
        nav: "the rest of the lesson",
        panel: (
          <Panel kicker="In the free lesson" title={LESSON_TITLE}>
            <ul className="grid gap-1 text-[0.98rem]">
              {["The four pathways", "Clinical connections", "Psych/Soc connection: reward prediction error"].map((t) => (
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
        figure: figure(id),
      };
  }
}

export type SynapseSet = { steps: StepContent[]; phases: number[]; stills: React.ReactNode[]; blockedStills: Record<number, React.ReactNode>; blockedFigure: React.ReactNode };

/**
 * The beats a page shows, with the scene phase of each, its stills and the stills that change
 * when DAT is blocked. The prototype shows all five; the home page starts at "how it's made".
 */
export function synapseSet({ beats = ["molecule", "made", "receptors", "cleared", "whole"] as BeatId[], heroLevel = 1 as 1 | 2, priority = true } = {}): SynapseSet {
  const cleared = beats.indexOf("cleared");
  const whole = beats.indexOf("whole");
  const blockedStills: Record<number, React.ReactNode> = {};
  for (const i of [cleared, whole]) if (i >= 0) blockedStills[i] = <StillFrame key={`b${i}`}>{still(beats[i], true, false)}</StillFrame>;
  return {
    steps: beats.map((b) => step(b, heroLevel)),
    phases: beats.map((b) => BEAT[b].phase),
    stills: beats.map((b, i) => <StillFrame key={`${b}${i}`}>{still(b, false, priority && i === 0)}</StillFrame>),
    blockedStills,
    blockedFigure: figure("cleared", true),
  };
}

/** Shabari's clinical line about DAT, shown when the visitor blocks the transporter. */
export const DAT_NOTE = "Cocaine blocks DAT; amphetamine reverses DAT and releases dopamine. Both raise synaptic dopamine in the mesolimbic pathway.";
