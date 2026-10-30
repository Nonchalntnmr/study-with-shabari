"use client";
import { ANATOMY, ANATOMY_CREDIT } from "@/lib/explore/anatomy-regions";
import { ModelExplorer } from "./model-explorer";

export function AnatomyExplorer() {
  return <ModelExplorer config={ANATOMY} credit={ANATOMY_CREDIT.short} />;
}
