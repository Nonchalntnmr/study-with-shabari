"use client";

import { useActiveBeat } from "./scroll-story";

/**
 * The still for the active beat, inside the stage: what the stage shows when WebGL is off or
 * before the scene is ready. Every still is server-rendered; only the visible one is shown.
 */
export function Stills({ stills, className = "" }: { stills: React.ReactNode[]; className?: string }) {
  const active = useActiveBeat();
  return (
    <div className={`relative h-full w-full ${className}`}>
      {stills.map((s, i) => (
        <div key={i} data-still={i} className={`absolute inset-0 transition-opacity duration-500 ${i === active ? "opacity-100" : "opacity-0"}`}>
          {s}
        </div>
      ))}
    </div>
  );
}

/** Where a still sits in the stage: right of the caption column on desktop, above it on a phone. */
export function StillFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-6 max-md:items-start max-md:pt-[6svh] md:pl-[38%] md:pr-[6%]">
      <div className="relative w-full max-w-[38rem] max-md:max-w-[22rem]">{children}</div>
    </div>
  );
}
