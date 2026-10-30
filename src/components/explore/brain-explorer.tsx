"use client";
import { BRAIN, BRAIN_CREDIT } from "@/lib/explore/brain-regions";
import { ModelExplorer } from "./model-explorer";

export function BrainExplorer() {
  return <ModelExplorer config={BRAIN} credit={BRAIN_CREDIT.short} />;
}
