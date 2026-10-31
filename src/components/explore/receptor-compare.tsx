"use client";

import { useState } from "react";
import { NEW } from "@/lib/explore/signaling-copy";
import { NA } from "./membrane-figure";

// Ionotropic against metabotropic, side by side, with one control: bind the neurotransmitter.
// Ionotropic: a ligand-gated channel opens and Na⁺ flows in. Metabotropic: a 7-helix receptor
// activates a G protein, which acts on an enzyme that makes a second messenger.

const W = 300;
const H = 220;
const M0 = 82;
const M1 = 132;
const FONT = "var(--font-schibsted), ui-sans-serif, sans-serif";
const LIGAND = "#1F5BFF";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="h-auto w-full" fontFamily={FONT}>
      <title>{title}</title>
      <rect x="0" y="0" width={W} height={M0} fill="#EEF4FF" />
      <rect x="0" y={M1} width={W} height={H - M1} fill="#FBF8F2" />
      <rect x="0" y={M0} width={W} height={M1 - M0} fill="#E2E8F0" />
      <path d={`M0 ${M0 + 5}H${W}M0 ${M1 - 5}H${W}`} stroke="#94A3B8" strokeWidth="6" strokeDasharray="7 3" />
      <text x="8" y="15" fontSize="11" fill="#475569">
        Synaptic cleft
      </text>
      <text x="8" y={H - 8} fontSize="11" fill="#475569">
        Postsynaptic cell
      </text>
      {children}
    </svg>
  );
}

const Ligand = ({ x, y }: { x: number; y: number }) => <path d={`M${x - 7},${y + 5} L${x},${y - 7} L${x + 7},${y + 5} Z`} fill={LIGAND} />;

export function IonotropicFigure({ bound }: { bound: boolean }) {
  const cx = 150;
  return (
    <Shell title={`Ionotropic receptor: a ligand-gated ion channel, ${bound ? "open, with Na⁺ flowing in" : "closed"}`}>
      <g data-ionotropic={bound ? "open" : "closed"}>
        <rect x={cx - 36} y={M0 - 18} width={28} height={M1 - M0 + 36} rx={12} fill="#C7D2FE" stroke="#3730A3" strokeWidth="1.5" />
        <rect x={cx + 8} y={M0 - 18} width={28} height={M1 - M0 + 36} rx={12} fill="#C7D2FE" stroke="#3730A3" strokeWidth="1.5" />
        {!bound && <rect x={cx - 8} y={(M0 + M1) / 2 - 3} width={16} height={6} rx={2} fill="#3730A3" />}
        {/* binding sites on the cleft side */}
        <circle cx={cx - 22} cy={M0 - 22} r="8" fill="#FFFFFF" stroke="#3730A3" strokeWidth="1.5" />
        <circle cx={cx + 22} cy={M0 - 22} r="8" fill="#FFFFFF" stroke="#3730A3" strokeWidth="1.5" />
        {bound && (
          <>
            <Ligand x={cx - 22} y={M0 - 22} />
            <Ligand x={cx + 22} y={M0 - 22} />
            {[0, 1, 2].map((i) => (
              <circle key={i} cx={cx} cy={M0 - 6 + i * 34} r="6" fill={NA} stroke="#FFFFFF" />
            ))}
            <path d={`M${cx + 52},${M0 - 10} V${M1 + 22}`} stroke={NA} strokeWidth="2.5" markerEnd="url(#sig-arrow-na)" />
            <text x={cx + 60} y={M1 + 20} fontSize="11" fontWeight="700" fill="#9A3412">
              Na⁺ in
            </text>
          </>
        )}
        {!bound && (
          <>
            <Ligand x={70} y={36} />
            <Ligand x={236} y={48} />
          </>
        )}
      </g>
      <defs>
        <marker id="sig-arrow-na" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={NA} />
        </marker>
      </defs>
      <text x={cx} y={H - 26} fontSize="11.5" fontWeight="700" fill="#0B1F44" textAnchor="middle">
        {bound ? "channel open" : "channel closed"}
      </text>
    </Shell>
  );
}

export function MetabotropicFigure({ bound }: { bound: boolean }) {
  const rx = 96;
  return (
    <Shell title={`Metabotropic receptor: a G protein-coupled receptor, ${bound ? "activating its G protein, which raises a second messenger" : "inactive"}`}>
      <g data-metabotropic={bound ? "active" : "inactive"}>
        {Array.from({ length: 7 }, (_, k) => (
          <rect key={k} x={rx - 30 + k * 9} y={M0 - 8} width="7" height={M1 - M0 + 16} rx="3.5" fill="#DDD6FE" stroke="#5B21B6" strokeWidth="1" />
        ))}
        <circle cx={rx} cy={M0 - 16} r="8" fill="#FFFFFF" stroke="#5B21B6" strokeWidth="1.5" />
        {bound ? <Ligand x={rx} y={M0 - 16} /> : <Ligand x={210} y={40} />}
        {/* G protein: α, β, γ under the membrane */}
        <g style={{ transform: bound ? "translate(46px, 0px)" : "translate(0px, 0px)" }} className="transition-transform duration-700 motion-reduce:transition-none">
          <circle cx={rx + 8} cy={M1 + 18} r="13" fill={bound ? "#6A4FD6" : "#CBD5E1"} stroke="#5B21B6" strokeWidth="1.2" />
          <text x={rx + 8} y={M1 + 22} fontSize="11" fontWeight="700" fill={bound ? "#FFFFFF" : "#334155"} textAnchor="middle">
            α
          </text>
        </g>
        <circle cx={rx - 16} cy={M1 + 22} r="9" fill="#E2E8F0" stroke="#64748B" />
        <circle cx={rx - 30} cy={M1 + 14} r="7" fill="#E2E8F0" stroke="#64748B" />
        <text x={rx - 23} y={M1 + 48} fontSize="10.5" fill="#334155" textAnchor="middle">
          G protein
        </text>
        {/* effector enzyme and second messenger */}
        <rect x={196} y={M0 - 6} width={30} height={M1 - M0 + 12} rx="10" fill="#E7E5E4" stroke="#78716C" />
        <text x={211} y={M0 - 12} fontSize="10.5" fill="#334155" textAnchor="middle">
          enzyme
        </text>
        {bound &&
          [0, 1, 2, 3, 4].map((i) => <circle key={i} cx={200 + (i % 3) * 16} cy={M1 + 30 + Math.floor(i / 3) * 16} r="5" fill="#2B3A66" />)}
        {bound && (
          <text x={252} y={M1 + 40} fontSize="11" fontWeight="700" fill="#0B1F44">
            cAMP
          </text>
        )}
      </g>
      <text x={150} y={H - 26} fontSize="11.5" fontWeight="700" fill="#0B1F44" textAnchor="middle">
        {bound ? "G protein active" : "G protein inactive"}
      </text>
    </Shell>
  );
}

export function ReceptorCompare() {
  const [bound, setBound] = useState(false);
  return (
    <div data-explorer="receptors">
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" aria-pressed={bound} onClick={() => setBound(!bound)} className="sig-button-primary">
          {bound ? "Remove the neurotransmitter" : "Bind the neurotransmitter"}
        </button>
        <p role="status" aria-live="polite" className="text-[1.02rem] text-specimen/90" data-receptor-status={bound ? "bound" : "unbound"}>
          {bound ? NEW.bound : NEW.unbound}
        </p>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl border border-hairline bg-white p-5 sm:p-7">
          <h3 className="text-[1.5rem]">Ionotropic</h3>
          <div className="mt-4">
            <IonotropicFigure bound={bound} />
          </div>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-specimen/90">{NEW.ionotropic}</p>
          <p className="mt-2 text-[1rem] text-quiet">{NEW.ionotropicExample}</p>
        </article>
        <article className="rounded-2xl border border-hairline bg-white p-5 sm:p-7">
          <h3 className="text-[1.5rem]">Metabotropic</h3>
          <div className="mt-4">
            <MetabotropicFigure bound={bound} />
          </div>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-specimen/90">{NEW.metabotropic}</p>
          <p className="mt-2 text-[1rem] text-quiet">{NEW.metabotropicExample}</p>
        </article>
      </div>
    </div>
  );
}
