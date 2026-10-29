import { type MoleculeData, benzeneRing, neighbors } from "@/lib/molecules/analyze";

// Skeletal formula drawn from PubChem's 2D depiction coordinates. Carbons are
// vertices, heteroatoms are labeled with their hydrogens, double bonds come from
// the data (Kekulé form), and the stereocenter wedge is drawn as recorded.

export type Annotation = { atoms: [number, number]; text: string };

type Props = {
  molecule: MoleculeData;
  highlight?: number[]; // atom indices drawn in the accent colour
  highlightColor?: string;
  annotations?: Annotation[];
  bondScale?: number; // px per bond
  title: string;
  className?: string;
  ink?: string;
  /** Rotate the depiction so the ring-to-side-chain direction points up (consistent schemes). */
  sideChainUp?: boolean;
};

const SUB = { "2": "₂", "3": "₃" } as Record<string, string>;

export function Skeletal({ molecule, highlight = [], highlightColor = "#C23F67", annotations = [], bondScale = 34, title, className, ink = "#2E2560", sideChainUp = false }: Props) {
  const nb = neighbors(molecule.bonds2d, molecule.atoms2d.length);
  const atoms = sideChainUp ? rotateSideChainUp(molecule, nb) : molecule.atoms2d;
  const heavy = atoms.map((a, i) => ({ ...a, i })).filter((a) => a.el !== "H");
  const hCount = (i: number) => nb[i].filter((n) => atoms[n].el === "H").length;
  const ring = new Set(benzeneRing(molecule));
  const ringCenter = (() => {
    const pts = [...ring].map((i) => atoms[i]);
    return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
  })();

  const pad = 0.8;
  const minX = Math.min(...heavy.map((a) => a.x)) - pad;
  const maxX = Math.max(...heavy.map((a) => a.x)) + pad;
  const minY = Math.min(...heavy.map((a) => a.y)) - pad;
  const maxY = Math.max(...heavy.map((a) => a.y)) + pad;
  const W = (maxX - minX) * bondScale;
  const H = (maxY - minY) * bondScale;
  const px = (x: number) => (x - minX) * bondScale;
  const py = (y: number) => (maxY - y) * bondScale; // SVG y points down
  const hl = new Set(highlight);

  const label = (i: number): string | null => {
    const a = atoms[i];
    if (a.el === "C") return null;
    const h = hCount(i);
    const heavyNb = nb[i].filter((n) => atoms[n].el !== "H");
    const leftward = heavyNb.length > 0 && atoms[heavyNb[0]].x > a.x + 0.2; // substituent points left
    const hs = h === 0 ? "" : h === 1 ? "H" : `H${SUB[String(h)] ?? h}`;
    return leftward ? `${hs}${a.el}` : `${a.el}${hs}`;
  };
  const labeled = new Set(heavy.filter((a) => label(a.i)).map((a) => a.i));
  const gap = 0.42; // trimmed bond length near a label, in bond units

  const bonds = molecule.bonds2d.filter(([a, b]) => atoms[a].el !== "H" && atoms[b].el !== "H");

  return (
    <svg viewBox={`0 0 ${W.toFixed(1)} ${H.toFixed(1)}`} role="img" aria-label={title} className={className}>
      <title>{title}</title>
      <g strokeLinecap="round" strokeWidth={2.3}>
        {bonds.map(([a, b, order, stereo]) => {
          const A = atoms[a];
          const B = atoms[b];
          const dx = B.x - A.x;
          const dy = B.y - A.y;
          const len = Math.hypot(dx, dy);
          const ux = dx / len;
          const uy = dy / len;
          const sa = labeled.has(a) ? gap : 0;
          const sb = labeled.has(b) ? gap : 0;
          const x1 = A.x + ux * sa;
          const y1 = A.y + uy * sa;
          const x2 = B.x - ux * sb;
          const y2 = B.y - uy * sb;
          const color = hl.has(a) && hl.has(b) ? highlightColor : ink;
          const key = `${a}-${b}`;
          if (stereo === 1) {
            // wedge: narrow at the stereocenter (a), wide at b
            const nx = -uy * 0.11;
            const ny = ux * 0.11;
            return <polygon key={key} fill={color} points={`${px(x1)},${py(y1)} ${px(x2 + nx)},${py(y2 + ny)} ${px(x2 - nx)},${py(y2 - ny)}`} />;
          }
          const main = <line key={key} x1={px(x1)} y1={py(y1)} x2={px(x2)} y2={py(y2)} stroke={color} />;
          if (order !== 2) return main;
          // second line: inside the ring for ring bonds, otherwise to one side
          let nx = -uy;
          let ny = ux;
          if (ring.has(a) && ring.has(b)) {
            const mx = (A.x + B.x) / 2 - ringCenter.x;
            const my = (A.y + B.y) / 2 - ringCenter.y;
            if (nx * mx + ny * my > 0) {
              nx = -nx;
              ny = -ny;
            }
          }
          const off = 0.17;
          const trim = ring.has(a) && ring.has(b) ? 0.16 : 0;
          return (
            <g key={key}>
              {main}
              <line
                x1={px(x1 + nx * off + ux * trim)}
                y1={py(y1 + ny * off + uy * trim)}
                x2={px(x2 + nx * off - ux * trim)}
                y2={py(y2 + ny * off - uy * trim)}
                stroke={color}
              />
            </g>
          );
        })}
      </g>
      <g fontFamily="var(--font-body, sans-serif)" fontSize={bondScale * 0.62} fontWeight={600} textAnchor="middle" dominantBaseline="central">
        {heavy.map((a) => {
          const text = label(a.i);
          if (!text) return null;
          const color = hl.has(a.i) ? highlightColor : a.el === "O" ? "#B8456A" : a.el === "N" ? "#176A67" : ink;
          return (
            <text key={a.i} x={px(a.x)} y={py(a.y)} fill={color}>
              {text}
            </text>
          );
        })}
      </g>
      {annotations.map(({ atoms: [a, b], text }) => {
        const A = atoms[a];
        const B = atoms[b];
        const mx = (A.x + B.x) / 2;
        const my = (A.y + B.y) / 2;
        // push the note away from the ring center so it never sits on a bond
        const ox = mx - ringCenter.x;
        const oy = my - ringCenter.y;
        const ol = Math.hypot(ox, oy) || 1;
        return (
          <text
            key={`${a}-${b}`}
            x={px(mx + (ox / ol) * 0.62)}
            y={py(my + (oy / ol) * 0.62)}
            fontFamily="var(--font-body, sans-serif)"
            fontSize={bondScale * 0.42}
            fill="#4A5164"
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {text}
          </text>
        );
      })}
    </svg>
  );
}

function rotateSideChainUp(m: MoleculeData, nb: number[][]) {
  const ring = benzeneRing(m);
  const inRing = new Set(ring);
  const a = m.atoms2d;
  const anchor = ring.find((r) => nb[r].some((n) => !inRing.has(n) && a[n].el === "C"));
  if (anchor === undefined) return a;
  const cx = ring.reduce((s, i) => s + a[i].x, 0) / 6;
  const cy = ring.reduce((s, i) => s + a[i].y, 0) / 6;
  const angle = Math.PI / 2 - Math.atan2(a[anchor].y - cy, a[anchor].x - cx);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return a.map((p) => ({ el: p.el, x: cx + (p.x - cx) * c - (p.y - cy) * s, y: cy + (p.x - cx) * s + (p.y - cy) * c }));
}
