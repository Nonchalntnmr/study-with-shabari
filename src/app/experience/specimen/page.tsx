import type { Metadata } from "next";
import { specimenSteps, specimenStills } from "@/components/experience/specimen/specimen-content";
import { SpecimenStory } from "@/components/experience/specimen/specimen-story";
import { gateExperience } from "@/lib/experience/gate";

export const instant = false;
export const metadata: Metadata = { title: "Specimen", description: "Prototype: dopamine as a lit specimen, taken apart by functional group." };

export default function SpecimenPage() {
  gateExperience();
  return <SpecimenStory steps={specimenSteps()} stills={specimenStills()} />;
}
