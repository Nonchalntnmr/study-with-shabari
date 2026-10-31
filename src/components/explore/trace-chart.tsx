import { PEAK, REST, THRESHOLD, WINDOW_MS, refractoryBands, type Run } from "@/lib/explore/action-potential";
import { mv } from "@/lib/explore/signaling-copy";

// The membrane-potential trace: mV against ms, drawn up to the time cursor. Pure SVG, so it is the
// same with or without WebGL and is server-rendered before any script runs.

const W = 420;
const H = 236;
const L = 44;
const R = 12;
const T = 14;
const B = 34;
const V_TOP = 45;
const V_BOTTOM = -90;
export const tx = (t: number) => L + (t / WINDOW_MS) * (W - L - R);
export const vy = (v: number) => T + ((V_TOP - v) / (V_TOP - V_BOTTOM)) * (H - T - B);

const FONT = "var(--font-schibsted), ui-sans-serif, sans-serif";

export function TraceChart({ run, samples, cursor, title }: { run: Run | null; samples: { t: number; v: number }[]; cursor: number; title: string }) {
  const shown = samples.filter((p) => p.t <= cursor + 1e-9);
  const d = shown.map((p, i) => `${i ? "L" : "M"}${tx(p.t).toFixed(1)},${vy(p.v).toFixed(1)}`).join("");
  const last = shown.at(-1) ?? { t: 0, v: REST };
  const bands = refractoryBands(run).filter((b) => b.from <= cursor);
  const stimuli = run?.stimuli.filter((s) => s.at <= cursor) ?? [];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="h-auto w-full" fontFamily={FONT} data-trace>
      <title>{title}</title>
      <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="#FFFFFF" />
      {bands.map((b, i) => (
        <g key={i} data-band={b.kind}>
          <rect x={tx(b.from)} y={T} width={Math.max(0, tx(Math.min(b.to, cursor, WINDOW_MS)) - tx(b.from))} height={H - T - B} fill={b.kind === "absolute" ? "#FDE2D3" : "#FFF1E3"} />
          {tx(Math.min(b.to, WINDOW_MS)) - tx(b.from) > 34 && cursor >= b.to - 0.3 && (
            <text x={(tx(b.from) + tx(Math.min(b.to, WINDOW_MS))) / 2} y={T + 12} fontSize="10" fontWeight="600" fill="#8A3A12" textAnchor="middle">
              {b.kind === "absolute" ? "Absolute" : "Relative"}
            </text>
          )}
        </g>
      ))}
      {/* reference lines */}
      <line x1={L} x2={W - R} y1={vy(0)} y2={vy(0)} stroke="#CBD5E1" strokeWidth="1" />
      <line x1={L} x2={W - R} y1={vy(PEAK)} y2={vy(PEAK)} stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 4" />
      <line x1={L} x2={W - R} y1={vy(THRESHOLD)} y2={vy(THRESHOLD)} stroke="#C2410C" strokeWidth="1.25" strokeDasharray="5 4" />
      <line x1={L} x2={W - R} y1={vy(REST)} y2={vy(REST)} stroke="#64748B" strokeWidth="1.25" />
      <g fontSize="11" fill="#334155" textAnchor="end">
        <text x={L - 6} y={vy(PEAK) + 4}>+35</text>
        <text x={L - 6} y={vy(0) + 4}>0</text>
        <text x={L - 6} y={vy(THRESHOLD) + 4} fill="#9A3412" fontWeight="600">
          −55
        </text>
        <text x={L - 6} y={vy(REST) + 4}>−70</text>
        <text x={L - 6} y={vy(-80) + 10}>−80</text>
      </g>
      <text x={W - R - 4} y={vy(THRESHOLD) - 5} fontSize="10.5" fontWeight="600" fill="#9A3412" textAnchor="end">
        threshold
      </text>
      <text x={W - R - 4} y={vy(REST) + 13} fontSize="10.5" fill="#475569" textAnchor="end">
        rest
      </text>
      {/* time axis */}
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#94A3B8" />
      <g fontSize="10.5" fill="#475569" textAnchor="middle">
        {Array.from({ length: WINDOW_MS / 2 + 1 }, (_, i) => (
          <text key={i} x={tx(i * 2)} y={H - B + 14}>
            {i * 2}
          </text>
        ))}
        <text x={(L + W - R) / 2} y={H - 4} fontSize="11">
          time (ms)
        </text>
      </g>
      <text x={12} y={(T + H - B) / 2} fontSize="11" fill="#475569" textAnchor="middle" transform={`rotate(-90 12 ${(T + H - B) / 2})`}>
        mV
      </text>
      {/* stimuli */}
      {stimuli.map((s, i) => (
        <g key={i} data-stimulus={i + 1}>
          <path d={`M${tx(s.at)},${H - B - 2} l-4,8 h8 z`} fill="#1F5BFF" />
          <text x={tx(s.at) + 6} y={H - B - 4} fontSize="10" fontWeight="700" fill="#1747D1">
            S{i + 1}
          </text>
        </g>
      ))}
      {/* the trace */}
      <path d={d} fill="none" stroke="#0B1F44" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={tx(last.t)} cy={vy(last.v)} r="4" fill="#1F5BFF" stroke="#FFFFFF" strokeWidth="1.5" />
      <text x={Math.min(W - R - 2, tx(last.t) + 8)} y={Math.max(T + 10, vy(last.v) - 8)} fontSize="11.5" fontWeight="700" fill="#0B1F44" textAnchor={tx(last.t) > W - 70 ? "end" : "start"}>
        {mv(last.v)}
      </text>
    </svg>
  );
}
