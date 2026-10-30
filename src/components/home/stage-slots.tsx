"use client";

import { useMotionValueEvent, useScroll } from "motion/react";
import { useRef } from "react";
import { MesolimbicPathway } from "@/components/molecule/mesolimbic-pathway";
import { useStageMode } from "@/components/cinema/capabilities";
import { MoleculeStage } from "@/components/cinema/molecule-stage";
import { narrative } from "@/components/cinema/scene/narrative-store";

/** Full-bleed sticky stage behind the hero and story (768px and up). */
export function DesktopStage() {
  const { wide, mode } = useStageMode();
  const pathway = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", () => {
    if (!pathway.current) return;
    const { b, c } = narrative.marks;
    const start = b + (c - b) * 0.45;
    const o = Math.min(1, Math.max(0, (narrative.progress - start) / (c - start)));
    pathway.current.style.opacity = String(o);
    pathway.current.style.transform = `translateY(${(1 - o) * 24}px)`;
  });
  if (!wide) return null;
  return (
    <>
      <MoleculeStage linked className="absolute inset-0" />
      {mode === "live" && (
        <div ref={pathway} style={{ opacity: 0 }} className="pointer-events-none absolute inset-y-0 right-0 flex w-[58%] items-center justify-center pr-[4vw]">
          <MesolimbicPathway className="w-full max-w-[640px]" />
        </div>
      )}
    </>
  );
}

/** The model as a block after the buttons (below 768px), so a call to action is on the first screen. */
export function MobileStage() {
  const { wide } = useStageMode();
  return <div className="mt-10 h-[45svh] md:hidden">{!wide && <MoleculeStage linked={false} className="h-full w-full" />}</div>;
}
