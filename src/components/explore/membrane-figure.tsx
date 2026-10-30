import type { KState, NaState } from "@/lib/explore/action-potential";

// A patch of axon membrane during the action potential: a voltage-gated Na⁺ channel (activation
// gate in the pore, inactivation gate as a ball on a chain), a voltage-gated K⁺ channel and the
// Na⁺/K⁺-ATPase, with Na⁺ and K⁺ on either side. Drawn from the model's state at one moment, so the
// live view and the still for each phase are the same picture. Stylized and not to scale.

export const NA = "#EA580C";
export const K = "#6A4FD6";
const INK = "#0B1F44";
const FONT = "var(--font-schibsted), ui-sans-serif, sans-serif";

const W = 420;
const H = 252;
const M0 = 94; // membrane, outer surface
const M1 = 150; // membrane, inner surface
const NA_X = 78;
const K_X = 210;
const PUMP_X = 342;

// Ions at rest: Na⁺ mostly outside, K⁺ mostly inside (fixed positions, clear of the proteins).
const OUT_NA = [
  [18, 66], [36, 80], [122, 64], [140, 80], [160, 66], [250, 64], [268, 80], [100, 64], [396, 64], [404, 82], [110, 80], [8, 86],
];
const OUT_K = [[178, 80], [384, 72]];
const IN_K = [
  [20, 176], [40, 200], [116, 172], [136, 196], [158, 214], [252, 176], [272, 200], [296, 182], [316, 214], [404, 200], [122, 222], [262, 222],
];
const IN_NA = [[176, 186], [30, 222], [372, 214]];

const STATE_LABEL: Record<NaState | KState, string> = { closed: "closed", open: "open", inactivated: "inactivated" };

function Chip({ x, y, text, tone }: { x: number; y: number; text: string; tone: "on" | "off" | "blocked" }) {
  const w = text.length * 6.2 + 14;
  const fill = tone === "on" ? "#0B1F44" : tone === "blocked" ? "#9A3412" : "#FFFFFF";
  const color = tone === "off" ? "#334155" : "#FFFFFF";
  return (
    <g>
      <rect x={x - w / 2} y={y - 11} width={w} height={16} rx={8} fill={fill} stroke={tone === "off" ? "#94A3B8" : fill} />
      <text x={x} y={y + 1} fontSize="10.5" fontWeight="700" fill={color} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}

function Ion({ x, y, kind }: { x: number; y: number; kind: "na" | "k" }) {
  return <circle cx={x} cy={y} r={5.2} fill={kind === "na" ? NA : K} stroke="#FFFFFF" strokeWidth="1" />;
}

/** Two subunits with a pore between them; the gate is a bar across the pore when closed. */
function Channel({ cx, fill, stroke, open }: { cx: number; fill: string; stroke: string; open: boolean }) {
  return (
    <g>
      <rect x={cx - 25} y={M0 - 10} width={18} height={M1 - M0 + 20} rx={8} fill={fill} stroke={stroke} strokeWidth="1.5" />
      <rect x={cx + 7} y={M0 - 10} width={18} height={M1 - M0 + 20} rx={8} fill={fill} stroke={stroke} strokeWidth="1.5" />
      {open ? (
        <>
          <line x1={cx - 7} y1={(M0 + M1) / 2 - 2} x2={cx - 5} y2={(M0 + M1) / 2 - 14} stroke={stroke} strokeWidth="3.5" strokeLinecap="round" />
          <line x1={cx + 7} y1={(M0 + M1) / 2 - 2} x2={cx + 5} y2={(M0 + M1) / 2 - 14} stroke={stroke} strokeWidth="3.5" strokeLinecap="round" />
        </>
      ) : (
        <rect x={cx - 7} y={(M0 + M1) / 2 - 3} width={14} height={6} rx={2} fill={stroke} />
      )}
    </g>
  );
}

export function MembraneFigure({ na, k, flux, vInside, title, uid = "m" }: { na: NaState; k: KState; flux: { na: number[]; k: number[] }; vInside: number; title: string; uid?: string }) {
  const lipid = `lipid-${uid}`;
  const positiveInside = vInside > 0;
  const ballAt = na === "inactivated" ? { x: NA_X, y: M1 + 9 } : { x: NA_X - 26, y: M1 + 30 };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="h-auto w-full" fontFamily={FONT} data-membrane data-na={na} data-k={k}>
      <title>{title}</title>
      <defs>
        <pattern id={lipid} x="0" y={M0} width="10" height={M1 - M0} patternUnits="userSpaceOnUse">
          <circle cx="5" cy="4" r="3.6" fill="#94A3B8" />
          <circle cx="5" cy={M1 - M0 - 4} r="3.6" fill="#94A3B8" />
          <path d={`M4 8v16M6 8v16M4 ${M1 - M0 - 8}v-16M6 ${M1 - M0 - 8}v-16`} stroke="#CBD5E1" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={W} height={M0} fill="#EEF4FF" />
      <rect x="0" y={M1} width={W} height={H - M1} fill="#FBF8F2" />
      <rect x="0" y={M0} width={W} height={M1 - M0} fill={`url(#${lipid})`} />
      <text x="8" y="15" fontSize="11" fill="#475569">
        Outside the cell
      </text>
      <text x="8" y={H - 8} fontSize="11" fill="#475569">
        Inside the cell
      </text>

      {/* charge across the membrane: + outside at rest, flipped at the peak */}
      <g fontSize="13" fontWeight="700" textAnchor="middle" data-charge={positiveInside ? "inside-positive" : "outside-positive"}>
        {[30, 146, 276, 398].map((x) => (
          <g key={x}>
            <text x={x} y={M0 - 3} fill={positiveInside ? "#64748B" : "#B91C1C"}>
              {positiveInside ? "−" : "+"}
            </text>
            <text x={x} y={M1 + 13} fill={positiveInside ? "#B91C1C" : "#64748B"}>
              {positiveInside ? "+" : "−"}
            </text>
          </g>
        ))}
      </g>

      {OUT_NA.map(([x, y], i) => <Ion key={`on${i}`} x={x} y={y} kind="na" />)}
      {IN_NA.map(([x, y], i) => <Ion key={`in${i}`} x={x} y={y} kind="na" />)}
      {OUT_K.map(([x, y], i) => <Ion key={`ok${i}`} x={x} y={y} kind="k" />)}
      {IN_K.map(([x, y], i) => <Ion key={`ik${i}`} x={x} y={y} kind="k" />)}

      {/* voltage-gated Na⁺ channel */}
      <Channel cx={NA_X} fill="#FED7AA" stroke="#C2410C" open={na !== "closed"} />
      <path d={`M${NA_X - 16},${M1 + 10} Q${(NA_X - 16 + ballAt.x) / 2 - 6},${ballAt.y + 6} ${ballAt.x},${ballAt.y}`} fill="none" stroke="#C2410C" strokeWidth="2" strokeDasharray="3 2" />
      <circle cx={ballAt.x} cy={ballAt.y} r="7" fill="#C2410C" data-ball={na === "inactivated" ? "plugged" : "free"} />
      {flux.na.map((p, i) => (
        <Ion key={`fn${i}`} x={NA_X} y={M0 - 24 + p * (M1 - M0 + 58)} kind="na" />
      ))}
      <text x={NA_X} y="32" fontSize="11.5" fontWeight="700" fill={INK} textAnchor="middle">
        Na⁺ channel
      </text>
      <Chip x={NA_X} y={50} text={STATE_LABEL[na]} tone={na === "open" ? "on" : na === "inactivated" ? "blocked" : "off"} />

      {/* voltage-gated K⁺ channel */}
      <Channel cx={K_X} fill="#DDD6FE" stroke="#5B21B6" open={k === "open"} />
      {flux.k.map((p, i) => (
        <Ion key={`fk${i}`} x={K_X} y={M1 + 30 - p * (M1 - M0 + 66)} kind="k" />
      ))}
      <text x={K_X} y="32" fontSize="11.5" fontWeight="700" fill={INK} textAnchor="middle">
        K⁺ channel
      </text>
      <Chip x={K_X} y={50} text={STATE_LABEL[k]} tone={k === "open" ? "on" : "off"} />

      {/* Na⁺/K⁺-ATPase */}
      <rect x={PUMP_X - 30} y={M0 - 14} width={60} height={M1 - M0 + 28} rx={20} fill="#E2E8F0" stroke="#475569" strokeWidth="1.5" />
      <path d={`M${PUMP_X - 14},${M1 + 2} V${M0 - 6}`} stroke={NA} strokeWidth="2.5" markerEnd={`url(#up-${uid})`} />
      <path d={`M${PUMP_X + 14},${M0 - 2} V${M1 + 6}`} stroke={K} strokeWidth="2.5" markerEnd={`url(#down-${uid})`} />
      <defs>
        <marker id={`up-${uid}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={NA} />
        </marker>
        <marker id={`down-${uid}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={K} />
        </marker>
      </defs>
      <text x={PUMP_X - 18} y={M0 - 18} fontSize="10.5" fontWeight="700" fill="#9A3412" textAnchor="end">
        3 Na⁺
      </text>
      <text x={PUMP_X + 18} y={M1 + 22} fontSize="10.5" fontWeight="700" fill="#4C1D95">
        2 K⁺
      </text>
      <text x={PUMP_X} y={M1 + 38} fontSize="10" fill="#334155" textAnchor="middle">
        ATP → ADP
      </text>
      <text x={PUMP_X} y="32" fontSize="11.5" fontWeight="700" fill={INK} textAnchor="middle">
        Na⁺/K⁺-ATPase
      </text>

      {/* legend */}
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
