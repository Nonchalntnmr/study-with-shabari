import type { Metadata } from "next";
import { instrumentSteps, instrumentWords } from "@/components/experience/instrument/instrument-content";
import { InstrumentStory } from "@/components/experience/instrument/instrument-story";
import { gateExperience } from "@/lib/experience/gate";

export const instant = false;
export const metadata: Metadata = { title: "Instrument", description: "Prototype: an editorial 522 reveal in kinetic type, then her teaching approach in her words." };

export default function InstrumentPage() {
  gateExperience();
  return <InstrumentStory steps={instrumentSteps()} words={instrumentWords} />;
}
