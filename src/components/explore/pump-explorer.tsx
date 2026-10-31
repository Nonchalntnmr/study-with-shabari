"use client";

import { useState } from "react";
import { NEW } from "@/lib/explore/signaling-copy";
import { K, NA } from "./membrane-figure";

// The Na⁺/K⁺-ATPase cycle in three stills: 3 Na⁺ bind inside and ATP phosphorylates the pump; it
// opens outward, releases the Na⁺ and binds 2 K⁺; the phosphate comes off and it releases the K⁺
// inside. The visitor steps through; ions glide between stills unless motion is reduced.

const W = 420;
const H = 236;
const M0 = 92;
const M1 = 148;
const FONT = "var(--font-schibsted), ui-sans-serif, sans-serif";

const NA_AT = [
  [[198, 128], [222, 128], [210, 146]],
  [[176, 44], [210, 32], [244, 44]],
  [[146, 50], [212, 20], [272, 48]],
] as const;
const K_AT = [
  [[300, 44], [328, 62]],
  [[200, 104], [220, 104]],
  [[186, 206], [234, 210]],
] as const;
const P_AT = [[256, 158], [256, 158], [306, 206]] as const;
const CAPTIONS = [NEW.pump1, NEW.pump2, NEW.pump3];

function Ion({ at, kind }: { at: readonly [number, number]; kind: "na" | "k" }) {
  return (
    <circle
      cx={0}
      cy={0}
      r={6}
      fill={kind === "na" ? NA : K}
      stroke="#FFFFFF"
      strokeWidth="1"
      style={{ transform: `translate(${at[0]}px, ${at[1]}px)` }}
      className="transition-transform duration-700 ease-out motion-reduce:transition-none"
    />
  );
}

function PumpFigure({ step }: { step: number }) {
  const outward = step === 1;
  // The pump's cavity opens to one side at a time.
  const cavity = outward ? "M194,76 L194,118 Q210,132 226,118 L226,76 Z" : "M194,164 L194,122 Q210,108 226,122 L226,164 Z";
  const title = `The Na⁺/K⁺-ATPase, step ${step + 1} of 3`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="h-auto w-full" fontFamily={FONT} data-pump-step={step + 1}>
      <title>{title}</title>
      <rect x="0" y="0" width={W} height={M0} fill="#EEF4FF" />
      <rect x="0" y={M1} width={W} height={H - M1} fill="#FBF8F2" />
      <rect x="0" y={M0} width={W} height={M1 - M0} fill="#E2E8F0" />
      <path d={`M0 ${M0 + 5}H${W}M0 ${M1 - 5}H${W}`} stroke="#94A3B8" strokeWidth="6" strokeDasharray="7 3" />
      <text x="8" y="15" fontSize="11" fill="#475569">
        Outside the cell
      </text>
      <text x="8" y={H - 8} fontSize="11" fill="#475569">
        Inside the cell
      </text>
      <rect x="166" y="74" width="88" height="92" rx="26" fill="#CBD5E1" stroke="#475569" strokeWidth="1.5" />
      <path d={cavity} fill="#FFFFFF" stroke="#475569" strokeWidth="1.2" />
      {NA_AT[step].map((at, i) => (
        <Ion key={`n${i}`} at={at} kind="na" />
      ))}
      {K_AT[step].map((at, i) => (
        <Ion key={`k${i}`} at={at} kind="k" />
      ))}
      <g style={{ transform: `translate(${P_AT[step][0]}px, ${P_AT[step][1]}px)` }} className="transition-transform duration-700 ease-out motion-reduce:transition-none">
        <circle r="9" fill="#FACC15" stroke="#A16207" strokeWidth="1.2" />
        <text y="4" fontSize="10.5" fontWeight="700" fill="#713F12" textAnchor="middle">
          P
        </text>
      </g>
      {step === 0 && (
        <text x="282" y="192" fontSize="11" fontWeight="600" fill="#334155">
          ATP → ADP
        </text>
      )}
      {step === 2 && (
        <text x="320" y="210" fontSize="11" fontWeight="600" fill="#334155">
          Pᵢ released
        </text>
      )}
      <g fontSize="10.5" fill="#334155">
        <circle cx={W - 92} cy={H - 12} r="5" fill={NA} />
        <text x={W - 83} y={H - 8}>
          Na⁺
        </text>
        <circle cx={W - 48} cy={H - 12} r="5" fill={K} />
        <text x={W - 39} y={H - 8}>
          K⁺
        </text>
      </g>
    </svg>
  );
}

export function PumpExplorer() {
  const [step, setStep] = useState(0);
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14" data-explorer="pump">
      <div className="min-w-0 space-y-5">
        <div role="group" aria-label="Pump cycle" className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <button key={i} type="button" aria-pressed={step === i} onClick={() => setStep(i)} className="sig-step">
              Step {i + 1}
            </button>
          ))}
        </div>
        <p role="status" aria-live="polite" className="min-h-[4.5rem] rounded-xl border border-hairline bg-mist px-4 py-3 text-[1.02rem] leading-relaxed text-specimen" data-pump-status>
          <span className="font-semibold text-hema">Step {step + 1}.</span> {CAPTIONS[step]}
        </p>
        <button type="button" onClick={() => setStep((step + 1) % 3)} className="sig-button-secondary">
          {step === 2 ? "Start the cycle again" : "Next step"}
        </button>
      </div>
      <figure className="min-w-0 rounded-2xl border border-hairline bg-white p-3 sm:p-5">
        <PumpFigure step={step} />
      </figure>
    </div>
  );
}
