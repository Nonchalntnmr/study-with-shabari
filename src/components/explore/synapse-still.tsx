"use client";

// A client component only so the RSC payload carries its props, not its markup; it is still
// server-rendered into the HTML.
import { CAMP_MAX, GEOMETRY, STORED_PER_VESICLE, campCounts, fusion, particleAt, particlePlans } from "@/lib/experience/synapse-choreography";
import { clamp01, seeded } from "@/lib/experience/timeline";

// The synapse at one moment, as a still: what the stage shows when WebGL is off, motion is reduced,
// or before the 3D scene is ready. The same layout and particle positions as the Synapse
// prototype's scene (src/lib/experience/synapse-choreography.ts), at any phase, plus the
// voltage-gated Ca²⁺ channels this explorer needs. Dopamine is a small ring-and-chain glyph.

const S = 36;
const X0 = -8.6;
const Y0 = 6.6;
const W = 14.2 * S;
const H = 13.2 * S;
const sx = (x: number) => (x - X0) * S;
const sy = (y: number) => (Y0 - y) * S;
const FONT = "var(--font-schibsted), ui-sans-serif, sans-serif";
const CA = "#0E9F9A";

function smoothPath(pts: [number, number][]): string {
  const p = pts.map(([x, y]) => [sx(x), sy(y)]);
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)];
    const b = p[i];
    const c = p[i + 1];
    const e = p[Math.min(p.length - 1, i + 2)];
    d += ` C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)},${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)},${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`;
  }
  return d;
}

const membrane = (side: -1 | 1, inset = 0): [number, number][] => {
  const x = side * (1.2 + inset);
  return [
    [side * 10, 6.2 - inset],
    [side * 4.5, 5.8 - inset],
    [side * (1.7 + inset), 4.9 - inset],
    [x, 2.6],
    [x, 0],
    [x, -2.6],
    [side * (1.7 + inset), -4.9 + inset],
    [side * 4.5, -5.8 + inset],
    [side * 10, -6.2 + inset],
  ];
};

/** Voltage-gated Ca²⁺ channels in the presynaptic membrane, beside the release site. */
const CA_CHANNELS = [GEOMETRY.pore.y + 1.5, GEOMETRY.pore.y - 1.3];

export function SynapseStill({ phase, datBlocked = false, title, uid }: { phase: number; datBlocked?: boolean; title: string; uid: string }) {
  const glyph = `sig-da-${uid}`;
  const plans = particlePlans();
  const r = seeded(7);
  const stored = GEOMETRY.vesicles.slice(1).flatMap((v) =>
    Array.from({ length: STORED_PER_VESICLE }, () => {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * v.r * 0.62;
      return { x: v.x + Math.cos(a) * d, y: v.y + Math.sin(a) * d, rot: r() * 360 };
    }),
  );
  const f = fusion(phase);
  const counts = campCounts(phase, datBlocked);
  const cr = seeded(23);
  const camp = (["D1", "D2"] as const).flatMap((kind) =>
    Array.from({ length: CAMP_MAX }, (_, n) => ({ kind, n, x: 2.0 + 2.6 * cr(), y: (kind === "D1" ? 1 : -1) * (1.2 + 3.4 * cr()) })),
  );
  const caOpen = phase >= 1.4 && phase < 2.9;
  const caIn = clamp01((phase - 1.4) / 0.4);
  const showCamp = phase >= 3.4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="h-auto w-full" fontFamily={FONT} data-synapse-still={phase.toFixed(2)}>
      <title>{title}</title>
      <defs>
        <g id={glyph}>
          <polygon points="0,-4.2 3.6,-2.1 3.6,2.1 0,4.2 -3.6,2.1 -3.6,-2.1" fill="#FFFFFF" stroke="#1B2A5C" strokeWidth="1.5" />
          <line x1="3.6" y1="0" x2="9" y2="0" stroke="#1B2A5C" strokeWidth="1.5" />
          <circle cx="10.4" cy="0" r="1.9" fill="#0E9F9A" />
          <circle cx="-4.6" cy="-3" r="1.5" fill="#6A4FD6" />
          <circle cx="-4.6" cy="3" r="1.5" fill="#6A4FD6" />
        </g>
      </defs>

      <path d={`${smoothPath(membrane(-1))} L${sx(-10)},${sy(-7)} L${sx(-10)},${sy(7)} Z`} fill="#F3EEE4" />
      <path d={smoothPath(membrane(-1))} fill="none" stroke="#5B6785" strokeWidth="3" />
      <path d={smoothPath(membrane(-1, 0.3))} fill="none" stroke="#9AA3BA" strokeWidth="2" />
      <path d={`${smoothPath(membrane(1))} L${sx(10)},${sy(-7)} L${sx(10)},${sy(7)} Z`} fill="#F1F1F5" />
      <path d={smoothPath(membrane(1))} fill="none" stroke="#5B6785" strokeWidth="3" />
      <path d={smoothPath(membrane(1, 0.3))} fill="none" stroke="#9AA3BA" strokeWidth="2" />
      <g fontSize="16" fontWeight="600" fill="#0B1F44">
        <text x={sx(-8.2)} y={sy(-6.3)}>Axon terminal</text>
        <text x={sx(5.4)} y={sy(-6.3)} textAnchor="end">
          Postsynaptic
        </text>
      </g>
      <text x={sx(0)} y={sy(5.9)} fontSize="15" fill="#4A5160" textAnchor="middle">
        cleft
      </text>

      {/* the action potential arriving, and voltage-gated Ca²⁺ channels */}
      {phase >= 1.2 && phase < 2.9 && (
        <path d={`M${sx(-7.8)},${sy(5.6)} Q${sx(-3)},${sy(5.4)} ${sx(-1.8)},${sy(3.4)}`} fill="none" stroke="#1F5BFF" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
      )}
      {CA_CHANNELS.map((y, i) => (
        <g key={i} data-ca-channel={caOpen ? "open" : "closed"}>
          <rect x={sx(GEOMETRY.preMembraneX) - 7} y={sy(y + 0.28)} width="5" height={0.56 * S} rx="2" fill={CA} />
          <rect x={sx(GEOMETRY.preMembraneX) + 2} y={sy(y + 0.28)} width="5" height={0.56 * S} rx="2" fill={CA} />
          {!caOpen && <rect x={sx(GEOMETRY.preMembraneX) - 2} y={sy(y) - 2} width="4" height="4" fill="#0B6E6A" />}
        </g>
      ))}
      {caOpen &&
        CA_CHANNELS.flatMap((y, i) =>
          [0, 1, 2].map((k) => (
            <circle key={`${i}${k}`} cx={sx(GEOMETRY.preMembraneX + 0.6 - caIn * (0.9 + k * 0.45))} cy={sy(y + (k - 1) * 0.25)} r="4.5" fill="#7FD3CF" stroke={CA} />
          )),
        )}
      {phase >= 1.2 && phase < 2.9 && (
        <g fontSize="14" fontWeight="700" fill="#0B6E6A">
          <text x={sx(-1.9)} y={sy(CA_CHANNELS[0] + 0.75)} textAnchor="end">
            Ca²⁺
          </text>
          <text x={sx(-6.4)} y={sy(6.0)} fill="#1747D1">
            action potential
          </text>
        </g>
      )}

      {/* vesicles */}
      {GEOMETRY.vesicles.map((v, i) => {
        const rr = i === 0 ? v.r * (1 - Math.max(0, (f - 0.55) / 0.45)) : v.r;
        const cx = i === 0 ? v.x + (GEOMETRY.preMembraneX - v.r * 0.55 - v.x) * Math.min(1, f * 1.4) : v.x;
        return rr > 0.05 ? <circle key={i} cx={sx(cx)} cy={sy(v.y)} r={rr * S} fill="#ECE8F8" stroke="#8C7BE0" strokeWidth="2" /> : null;
      })}
      {stored.map((p, i) => (
        <use key={i} href={`#${glyph}`} transform={`translate(${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}) rotate(${p.rot.toFixed(0)}) scale(0.8)`} />
      ))}

      {/* receptors, adenylyl cyclase and cAMP */}
      {GEOMETRY.receptors.map((rc, i) => (
        <g key={i}>
          {Array.from({ length: 7 }, (_, k) => (
            <rect key={k} x={sx(GEOMETRY.postMembraneX - 0.3 + k * 0.1)} y={sy(rc.y + 0.32)} width="3" height={0.64 * S} rx="1.5" fill={rc.kind === "D1" ? "#6A4FD6" : "#0E9F9A"} />
          ))}
          <circle cx={sx(2.2)} cy={sy(rc.y)} r="7" fill="#D9DDE6" stroke={rc.kind === "D1" ? "#6A4FD6" : "#0E9F9A"} strokeWidth="1.5" />
        </g>
      ))}
      <g fontSize="15" fontWeight="600">
        <text x={sx(2.75)} y={sy(2.3)} fill="#4B33B5">
          D1 · Gs
        </text>
        <text x={sx(2.75)} y={sy(-2.3)} fill="#0B6E6A">
          D2 · Gi
        </text>
      </g>
      {GEOMETRY.cyclase.map((c, i) => (
        <rect key={i} x={sx(GEOMETRY.postMembraneX - 0.05)} y={sy(c.y + 0.55)} width={0.6 * S} height={1.1 * S} rx="10" fill="#B6AE9E" />
      ))}
      {showCamp &&
        camp.map((c) => (c.n < Math.round(c.kind === "D1" ? counts.D1 : counts.D2) ? <circle key={`${c.kind}${c.n}`} cx={sx(c.x)} cy={sy(c.y)} r="4" fill="#2B3A66" /> : null))}
      {showCamp && (
        <g fontSize="15" fontWeight="600" fill="#0B1F44" textAnchor="end">
          <text x={sx(4.9)} y={sy(4.9)}>cAMP ↑</text>
          <text x={sx(4.9)} y={sy(-5.0)}>cAMP ↓</text>
        </g>
      )}

      {/* the dopamine transporter */}
      {GEOMETRY.transporters.map((t, i) => (
        <g key={i}>
          {Array.from({ length: 6 }, (_, k) => (
            <rect key={k} x={sx(GEOMETRY.preMembraneX - 0.45 + k * 0.1)} y={sy(t.y + 0.38)} width="3" height={0.76 * S} rx="1.5" fill={datBlocked ? "#9AA3BA" : "#1B2A5C"} />
          ))}
          <text x={sx(GEOMETRY.preMembraneX - 0.75)} y={sy(t.y)} fontSize="15" fontWeight="600" fill="#0B1F44" textAnchor="end" dominantBaseline="central">
            {datBlocked ? "DAT ✕" : "DAT"}
          </text>
        </g>
      ))}

      {/* released dopamine, where the choreography puts it at this phase */}
      {plans.map((p, i) => {
        const { at } = particleAt(p, phase, datBlocked);
        return <use key={i} href={`#${glyph}`} transform={`translate(${sx(at.x).toFixed(1)} ${sy(at.y).toFixed(1)}) rotate(${(i * 47) % 360})`} />;
      })}
    </svg>
  );
}
