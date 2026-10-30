import { type GroupId, explosion2d } from "@/lib/experience/structure";
import { MOLECULES, benzeneRing, neighbors } from "@/lib/molecules/analyze";

// The exploded view as a still: PubChem's 2D depiction of dopamine, taken apart by the same groups
// and along the same cut bonds as the 3D scene (src/lib/experience/structure.ts). Broken bonds are
// dashed. Numbered markers match the legend under the figure. Used when WebGL is off and when
// motion is reduced.

const m = MOLECULES.dopamine;
const INK = "#0B1F44";
const O_INK = "#5A40C2";
const N_INK = "#0B7F7B";
const S = 44; // px per bond

export const GROUP_LEGEND: Record<GroupId, { n: number; title: string; body: string }> = {
  ring: { n: 1, title: "Benzene ring", body: "C₆, aromatic: the catechol’s core" },
  oh3: { n: 2, title: "3-OH", body: "the hydroxyl added by tyrosine hydroxylase" },
  oh4: { n: 3, title: "4-OH", body: "the hydroxyl already on tyrosine" },
  chain: { n: 4, title: "Ethylamine side chain", body: "–CH₂–CH₂–NH₂, protonated to –NH₃⁺ at pH 7.4 (pKa ≈ 10)" },
};

export function ExplodedFigure({ assembled = false, protonated = true, achiral = false, title, className }: { assembled?: boolean; protonated?: boolean; achiral?: boolean; title: string; className?: string }) {
  const { groups, displacement } = explosion2d(m);
  const nb = neighbors(m.bonds2d, m.atoms2d.length);
  const group: GroupId[] = [];
  for (const g of groups) for (const i of g.atoms) group[i] = g.id;
  const k = assembled ? 0 : 1;
  const pts = m.atoms2d.map((a, i) => ({ el: a.el, x: a.x + displacement[group[i]].x * k, y: a.y + displacement[group[i]].y * k }));
  const heavy = pts.map((p, i) => ({ ...p, i })).filter((p) => p.el !== "H");
  const ring = new Set(benzeneRing(m));
  const cuts = new Set(groups.filter((g) => g.cut).map((g) => `${Math.min(...g.cut!)}-${Math.max(...g.cut!)}`));
  const chainC = groups.find((g) => g.id === "chain")!.heavy.filter((i) => pts[i].el === "C");

  const pad = 1.25;
  const minX = Math.min(...heavy.map((a) => a.x)) - pad;
  const maxX = Math.max(...heavy.map((a) => a.x)) + pad;
  const minY = Math.min(...heavy.map((a) => a.y)) - pad;
  const maxY = Math.max(...heavy.map((a) => a.y)) + pad;
  const px = (x: number) => (x - minX) * S;
  const py = (y: number) => (maxY - y) * S;
  const rc = [...ring].reduce((s, i) => ({ x: s.x + pts[i].x / 6, y: s.y + pts[i].y / 6 }), { x: 0, y: 0 });

  const hs = (i: number) => nb[i].filter((n) => m.atoms2d[n].el === "H").length + (protonated && pts[i].el === "N" ? 1 : 0);
  const label = (i: number) => {
    const a = pts[i];
    if (a.el === "C") return null;
    const h = hs(i);
    const sub = h === 2 ? "₂" : h === 3 ? "₃" : "";
    const hx = h === 0 ? "" : `H${sub}`;
    const heavyNb = nb[i].filter((n) => pts[n].el !== "H");
    const left = heavyNb.length > 0 && pts[heavyNb[0]].x > a.x + 0.2;
    return { text: left ? `${hx}${a.el}` : `${a.el}${hx}`, plus: a.el === "N" && protonated };
  };
  const labeled = new Set(heavy.filter((a) => label(a.i)).map((a) => a.i));

  const markers = groups.map((g) => {
    const c = g.heavy.reduce((s, i) => ({ x: s.x + pts[i].x / g.heavy.length, y: s.y + pts[i].y / g.heavy.length }), { x: 0, y: 0 });
    if (g.id === "ring") return { id: g.id, x: rc.x, y: rc.y };
    const d = displacement[g.id];
    const l = Math.hypot(d.x, d.y) || 1;
    // Beside the group, perpendicular to its travel, so the marker never covers a bond.
    return { id: g.id, x: c.x - (d.y / l) * 0.75, y: c.y + (d.x / l) * 0.75 };
  });

  return (
    <svg viewBox={`0 0 ${((maxX - minX) * S).toFixed(1)} ${((maxY - minY) * S).toFixed(1)}`} role="img" aria-label={title} className={className}>
      <title>{title}</title>
      <g strokeLinecap="round" strokeWidth={2.4}>
        {m.bonds2d
          .filter(([a, b]) => pts[a].el !== "H" && pts[b].el !== "H")
          .map(([a, b, order]) => {
            const A = pts[a];
            const B = pts[b];
            const dx = B.x - A.x;
            const dy = B.y - A.y;
            const len = Math.hypot(dx, dy);
            const ux = dx / len;
            const uy = dy / len;
            const ta = labeled.has(a) ? 0.42 : 0;
            const tb = labeled.has(b) ? 0.42 : 0;
            const x1 = A.x + ux * ta;
            const y1 = A.y + uy * ta;
            const x2 = B.x - ux * tb;
            const y2 = B.y - uy * tb;
            const key = `${a}-${b}`;
            const cut = cuts.has(`${Math.min(a, b)}-${Math.max(a, b)}`) && !assembled;
            const strong = achiral && chainC.includes(a) && chainC.includes(b);
            const color = cut ? "#9AA1B4" : strong ? "#0E9F9A" : INK;
            const main = <line key={key} x1={px(x1)} y1={py(y1)} x2={px(x2)} y2={py(y2)} stroke={color} strokeDasharray={cut ? "4 6" : undefined} strokeWidth={cut ? 1.6 : 2.4} />;
            if (order !== 2) return main;
            let nx = -uy;
            let ny = ux;
            const mx = (A.x + B.x) / 2 - rc.x;
            const my = (A.y + B.y) / 2 - rc.y;
            if (nx * mx + ny * my > 0) {
              nx = -nx;
              ny = -ny;
            }
            return (
              <g key={key}>
                {main}
                <line x1={px(x1 + nx * 0.17 + ux * 0.16)} y1={py(y1 + ny * 0.17 + uy * 0.16)} x2={px(x2 + nx * 0.17 - ux * 0.16)} y2={py(y2 + ny * 0.17 - uy * 0.16)} stroke={color} />
              </g>
            );
          })}
      </g>
      {achiral &&
        chainC.map((c) => (
          <g key={c}>
            <circle cx={px(pts[c].x)} cy={py(pts[c].y)} r={7} fill="#E6F6F5" stroke="#0E9F9A" strokeWidth={1.6} />
            <text x={px(pts[c].x)} y={py(pts[c].y) - 16} textAnchor="middle" fontSize={15} fontWeight={600} fill="#0B6E6A" fontFamily="var(--font-schibsted), sans-serif">
              CH₂
            </text>
          </g>
        ))}
      <g fontFamily="var(--font-schibsted), sans-serif" fontSize={S * 0.6} fontWeight={600} textAnchor="middle" dominantBaseline="central">
        {heavy.map((a) => {
          const l = label(a.i);
          if (!l) return null;
          return (
            <text key={a.i} x={px(a.x)} y={py(a.y)} fill={a.el === "O" ? O_INK : a.el === "N" ? N_INK : INK}>
              {l.text}
              {l.plus && (
                <tspan dy={-10} fontSize={S * 0.42}>
                  +
                </tspan>
              )}
            </text>
          );
        })}
      </g>
      {!assembled &&
        markers.map((mk) => (
          <g key={mk.id} fontFamily="var(--font-schibsted), sans-serif">
            <circle cx={px(mk.x)} cy={py(mk.y)} r={11} fill={INK} />
            <text x={px(mk.x)} y={py(mk.y)} fill="#fff" fontSize={13} fontWeight={700} textAnchor="middle" dominantBaseline="central">
              {GROUP_LEGEND[mk.id].n}
            </text>
          </g>
        ))}
    </svg>
  );
}

/** The legend for the numbered markers, as plain text. */
export function ExplodedLegend({ className = "" }: { className?: string }) {
  return (
    <ol className={`grid gap-2 text-[0.98rem] leading-snug text-specimen/90 ${className}`}>
      {(Object.keys(GROUP_LEGEND) as GroupId[]).map((id) => (
        <li key={id} className="flex gap-3">
          <span aria-hidden className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-hema text-[11px] font-bold text-white">
            {GROUP_LEGEND[id].n}
          </span>
          <span>
            <strong className="font-semibold text-hema">{GROUP_LEGEND[id].title}</strong>: {GROUP_LEGEND[id].body}
          </span>
        </li>
      ))}
    </ol>
  );
}
