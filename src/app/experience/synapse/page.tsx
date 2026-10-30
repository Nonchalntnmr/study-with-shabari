import type { Metadata } from "next";
import { DAT_NOTE, synapseSet } from "@/components/experience/synapse/synapse-content";
import { SynapseStory } from "@/components/experience/synapse/synapse-story";
import { gateExperience } from "@/lib/experience/gate";

export const instant = false;
export const metadata: Metadata = { title: "Synapse", description: "Prototype: dopamine as a neurotransmitter, from vesicle to receptor to reuptake." };

export default function SynapsePage() {
  gateExperience();
  const set = synapseSet();
  return <SynapseStory steps={set.steps} phases={set.phases} stills={set.stills} blockedStills={set.blockedStills} blockedFigure={set.blockedFigure} datNote={DAT_NOTE} />;
}
