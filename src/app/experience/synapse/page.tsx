import type { Metadata } from "next";
import { DAT_NOTE, synapseBlockedStills, synapseSteps, synapseStills } from "@/components/experience/synapse/synapse-content";
import { SynapseFigure } from "@/components/experience/synapse/synapse-figure";
import { SynapseStory } from "@/components/experience/synapse/synapse-story";
import { gateExperience } from "@/lib/experience/gate";

export const instant = false;
export const metadata: Metadata = { title: "Synapse", description: "Prototype: dopamine as a neurotransmitter, from vesicle to receptor to reuptake." };

export default function SynapsePage() {
  gateExperience();
  return (
    <SynapseStory
      steps={synapseSteps()}
      stills={synapseStills()}
      blockedStills={synapseBlockedStills()}
      blockedFigure={<SynapseFigure beat={5} datBlocked uid="i" title="With DAT blocked, dopamine stays in the cleft and on its receptors" className="w-full" />}
      datNote={DAT_NOTE}
    />
  );
}
