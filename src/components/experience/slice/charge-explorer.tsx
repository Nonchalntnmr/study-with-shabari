"use client";

import { useId, useState } from "react";
import { AMINE_PKA, PHYSIOLOGICAL_PH, fractionProtonated } from "@/lib/experience/structure";

// The concept behind Q6, to play with: drag the pH and watch dopamine's amine pick up or lose its
// proton (Henderson–Hasselbalch with the lesson's pKa ≈ 10). Only shown after an answer.

export function ChargeExplorer() {
  const id = useId();
  const [pH, setPH] = useState(PHYSIOLOGICAL_PH);
  const f = fractionProtonated(pH, AMINE_PKA);
  const pct = f * 100;
  const shown = pct >= 99.95 ? ">99.9" : pct <= 0.05 ? "<0.1" : pct.toFixed(1);
  const curve = Array.from({ length: 141 }, (_, i) => {
    const x = i / 10;
    return `${i === 0 ? "M" : "L"}${(x / 14) * 300},${(1 - fractionProtonated(x, AMINE_PKA)) * 100 + 10}`;
  }).join(" ");
  return (
    <figure className="rounded-2xl border border-[color:var(--exp-rule)] bg-white p-5 sm:p-6" data-testid="charge-explorer">
      <figcaption className="exp-label-caps text-[color:var(--exp-quiet)]">The amine and pH</figcaption>
      <div className="mt-4 grid items-center gap-6 sm:grid-cols-[auto_1fr]">
        {/* the amine, drawn as it is at this pH (the majority form) */}
        <svg viewBox="0 0 150 110" className="w-36" role="img" aria-label={f >= 0.5 ? "Protonated amine, –NH₃⁺" : "Neutral amine, –NH₂"}>
          <line x1="12" y1="62" x2="58" y2="62" stroke="#0B1F44" strokeWidth="3" strokeLinecap="round" />
          <text x="10" y="92" fontSize="13" fill="#4A5160" fontFamily="var(--font-schibsted), sans-serif">
            –CH₂–CH₂–
          </text>
          <circle cx="78" cy="62" r="17" fill="#0E9F9A" opacity={0.18 + 0.5 * f} />
          <text x="78" y="68" textAnchor="middle" fontSize="18" fontWeight="700" fill="#0B5F5B" fontFamily="var(--font-schibsted), sans-serif">
            N
          </text>
          {[
            [108, 44],
            [108, 82],
          ].map(([x, y], i) => (
            <g key={i}>
              <line x1="92" y1="62" x2={x - 7} y2={y} stroke="#0B1F44" strokeWidth="2.5" />
              <text x={x} y={y + 5} fontSize="15" fontWeight="600" fill="#0B1F44" fontFamily="var(--font-schibsted), sans-serif">
                H
              </text>
            </g>
          ))}
          <g opacity={f}>
            <line x1="78" y1="44" x2="78" y2="22" stroke="#0B1F44" strokeWidth="2.5" />
            <text x="73" y="17" fontSize="15" fontWeight="600" fill="#0B1F44" fontFamily="var(--font-schibsted), sans-serif">
              H
            </text>
            <text x="98" y="30" fontSize="20" fontWeight="700" fill="#0B5F5B" fontFamily="var(--font-schibsted), sans-serif">
              +
            </text>
          </g>
        </svg>
        <div>
          <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-[1rem] font-semibold text-hema">
            <span>pH</span>
            <output htmlFor={id} className="font-display text-[1.6rem] tabular-nums">
              {pH.toFixed(1)}
            </output>
          </label>
          <input
            id={id}
            type="range"
            min={0}
            max={14}
            step={0.1}
            value={pH}
            onChange={(e) => setPH(Number(e.target.value))}
            aria-valuetext={`pH ${pH.toFixed(1)}: ${shown}% protonated`}
            className="mt-2 w-full accent-[#1F5BFF]"
          />
          <div className="mt-1 flex justify-between text-[0.85rem] text-[color:var(--exp-quiet)]">
            <span>0</span>
            <button type="button" className="underline underline-offset-4" onClick={() => setPH(PHYSIOLOGICAL_PH)}>
              pH {PHYSIOLOGICAL_PH} (blood)
            </button>
            <span>14</span>
          </div>
          <p className="mt-4 text-[1.0625rem] text-specimen" aria-live="polite">
            <strong className="font-semibold text-hema">{shown}%</strong> of the amine carries the proton. Net charge from the amine ≈{" "}
            <strong className="font-semibold text-hema">{f >= 0.995 ? "+1" : `+${f.toFixed(2)}`}</strong>.
          </p>
        </div>
      </div>
      <svg viewBox="0 0 300 120" className="mt-5 w-full" aria-hidden>
        <line x1="0" y1="110" x2="300" y2="110" stroke="#E4DDD0" />
        <line x1={(AMINE_PKA / 14) * 300} y1="0" x2={(AMINE_PKA / 14) * 300} y2="110" stroke="#E4DDD0" strokeDasharray="3 4" />
        <text x={(AMINE_PKA / 14) * 300 + 4} y="12" fontSize="9" fill="#4A5160">
          pKa ≈ {AMINE_PKA}
        </text>
        <path d={curve} fill="none" stroke="#0E9F9A" strokeWidth="2" />
        <circle cx={(pH / 14) * 300} cy={(1 - f) * 100 + 10} r="5" fill="#1F5BFF" />
        <text x="2" y="20" fontSize="9" fill="#4A5160">
          protonated
        </text>
        <text x="2" y="104" fontSize="9" fill="#4A5160">
          neutral
        </text>
      </svg>
      <p className="mt-2 text-[0.9rem] text-[color:var(--exp-quiet)]">
        Fraction protonated = 1 / (1 + 10<sup>pH − pKa</sup>). Below the pKa, most of the amine is protonated.
      </p>
    </figure>
  );
}
