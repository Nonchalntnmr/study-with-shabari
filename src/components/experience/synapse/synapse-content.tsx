import Image from "next/image";
import { BookLink, SecondaryLink } from "../chrome";
import { Panel, type StepContent } from "../scroll-story";
import { StillFrame } from "../stills";
import { SynapseFigure } from "./synapse-figure";

// The Synapse's words and stills. Receptor and clearance text is Shabari's, from her dopamine
// lesson (src/app/(site)/dopamine/page.tsx). The release and diffusion captions are standard
// neurobiology, kept to one plain sentence each; docs/EXPERIENCE.md lists them for her review.

const LESSON_TITLE = "Dopamine: One Molecule, Every MCAT Section";

const TITLES = [
  "The dopamine molecule",
  "Dopamine stored in vesicles in the presynaptic terminal",
  "An action potential arrives, calcium enters and a vesicle releases dopamine",
  "Dopamine in the synaptic cleft",
  "Dopamine bound to D1 and D2 receptors: cAMP rises beside D1 and falls beside D2",
  "Dopamine taken back up through the dopamine transporter",
  "The whole synapse",
];

export function synapseStills(datBlocked = false, priority = true): React.ReactNode[] {
  return TITLES.map((t, i) => (
    <StillFrame key={`${i}${datBlocked}`}>
      {i === 0 ? (
        <Image src="/images/dopamine-model-tight.png" alt="" width={918} height={727} priority={priority} sizes="(min-width: 768px) 38rem, 22rem" className="h-auto w-full" />
      ) : (
        <SynapseFigure beat={i} datBlocked={datBlocked} title={t} uid="s" className="w-full" />
      )}
    </StillFrame>
  ));
}

export const SCALE_NOTE = "Stylized and not to scale: molecules are drawn far larger than life, and D1 and D2 sit side by side for comparison (in the striatum they are mostly on different neurons).";

export function synapseSteps({ heroLevel = 1 as 1 | 2, title = "Dopamine" } = {}): StepContent[] {
  return [
    {
      id: "molecule",
      nav: "the molecule",
      panel: (
        <Panel kicker="Synapse" title={title} level={heroLevel}>
          <p>{LESSON_TITLE}. A free lesson written by Shabari.</p>
          <p>It’s a neurotransmitter and the precursor to norepinephrine and epinephrine.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-3">
            <BookLink />
            <SecondaryLink href="/dopamine">Read the free lesson</SecondaryLink>
          </div>
        </Panel>
      ),
      figure: <Image src="/images/dopamine-model-tight.png" alt="" width={918} height={727} sizes="(min-width: 768px) 38rem, 22rem" className="mx-auto h-auto w-full max-w-md" />,
    },
    {
      id: "vesicles",
      nav: "vesicles",
      panel: (
        <Panel kicker="1 · Stored" title="Packed into vesicles">
          <p>Dopamine is made in the presynaptic terminal and stored in synaptic vesicles.</p>
          <p className="text-[0.95rem] text-[color:var(--exp-quiet)]">Tyrosine → L-DOPA (tyrosine hydroxylase; rate-limiting) → dopamine (aromatic L-amino acid decarboxylase).</p>
        </Panel>
      ),
      figure: <SynapseFigure beat={1} title={TITLES[1]} className="w-full" />,
    },
    {
      id: "release",
      nav: "release",
      panel: (
        <Panel kicker="2 · Release" title="A vesicle opens">
          <p>An action potential reaches the terminal. Calcium (Ca²⁺) flows in, and a vesicle fuses with the membrane, releasing dopamine into the synaptic cleft.</p>
        </Panel>
      ),
      figure: <SynapseFigure beat={2} title={TITLES[2]} className="w-full" />,
    },
    {
      id: "cleft",
      nav: "the cleft",
      panel: (
        <Panel kicker="3 · Across" title="Crossing the cleft">
          <p>Dopamine diffuses across the synaptic cleft to receptors on the next neuron.</p>
        </Panel>
      ),
      figure: <SynapseFigure beat={3} title={TITLES[3]} className="w-full" />,
    },
    {
      id: "receptors",
      nav: "receptors",
      panel: (
        <Panel kicker="4 · Receptors" title="D1 against D2">
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
      figure: <SynapseFigure beat={4} title={TITLES[4]} className="w-full" />,
    },
    {
      id: "reuptake",
      nav: "reuptake",
      panel: (
        <Panel kicker="5 · Cleared" title="How it’s cleared">
          <p>Reuptake by the dopamine transporter (DAT), then breakdown by MAO and COMT. The main metabolite is homovanillic acid (HVA).</p>
        </Panel>
      ),
      figure: <SynapseFigure beat={5} title={TITLES[5]} className="w-full" />,
    },
    {
      id: "whole",
      nav: "the whole synapse",
      panel: (
        <Panel kicker="The rest of the lesson" title="One molecule, every MCAT section">
          <p>The four pathways, the clinical connections, and reward prediction error, in Shabari’s free lesson.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-3">
            <BookLink />
            <SecondaryLink href="/dopamine">Read the free lesson</SecondaryLink>
          </div>
        </Panel>
      ),
      figure: <SynapseFigure beat={6} title={TITLES[6]} className="w-full" />,
    },
  ];
}

/** With DAT blocked only the last two beats look different (reuptake never happens). */
export function synapseBlockedStills(): Record<number, React.ReactNode> {
  return Object.fromEntries(
    [5, 6].map((i) => [
      i,
      <StillFrame key={`b${i}`}>
        <SynapseFigure beat={i} datBlocked title={`${TITLES[i]}, with DAT blocked: dopamine stays in the cleft`} uid="s" className="w-full" />
      </StillFrame>,
    ]),
  );
}

/** Shabari's clinical line about DAT, shown when the visitor blocks the transporter. */
export const DAT_NOTE = "Cocaine blocks DAT; amphetamine reverses DAT and releases dopamine. Both raise synaptic dopamine in the mesolimbic pathway.";
