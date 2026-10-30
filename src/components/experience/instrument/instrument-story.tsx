"use client";

import { useState } from "react";
import { ScrollStory, type StepContent } from "../scroll-story";
import { createStore } from "../story-store";
import { InstrumentStage, type InstrumentWords } from "./instrument-stage";

/** The Instrument sequence: kinetic type on a sticky stage, the words from the server page. */
export function InstrumentStory({ steps, words, label = "522, then how she teaches" }: { steps: StepContent[]; words: InstrumentWords; label?: string }) {
  const [store] = useState(() => createStore(steps.length));
  return <ScrollStory store={store} label={label} steps={steps} stage={<div className="exp-spotlight h-full w-full"><InstrumentStage store={store} words={words} /></div>} />;
}
