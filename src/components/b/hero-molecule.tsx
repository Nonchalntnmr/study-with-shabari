"use client";

import { MoleculeStage } from "@/components/cinema/molecule-stage";

/**
 * The hero's interactive dopamine model in its own frame: drag to turn it, it
 * rocks gently at rest, and the pre-rendered still stands in when WebGL is
 * unavailable or motion is reduced. No scroll linkage.
 */
export function HeroMolecule() {
  return (
    <figure className="relative">
      <div data-stage className="aspect-[5/4] w-full">
        <MoleculeStage linked={false} className="h-full w-full" />
      </div>
      <figcaption className="mt-3 text-sm text-quiet">
        Dopamine, C₈H₁₁NO₂. Drag to rotate. Atom positions from PubChem’s 3D conformer (CID 681).
      </figcaption>
    </figure>
  );
}
