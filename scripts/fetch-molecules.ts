// Re-fetch molecule data from PubChem and write src/content/molecules/*.json.
//   npx tsx scripts/fetch-molecules.ts
// PubChem data are provided by NCBI/NLM and are in the public domain.

import { writeFileSync } from "node:fs";
import path from "node:path";

const MOLECULES = [
  { slug: "dopamine", cid: 681 },
  { slug: "l-tyrosine", cid: 6057 },
  { slug: "levodopa", cid: 6047 },
];

type Atom = { el: string; x: number; y: number; z: number };
type Bond = [number, number, number, number]; // a, b (0-based), order, stereo

function parseSdf(sdf: string) {
  const lines = sdf.split(/\r?\n/);
  const counts = lines[3];
  const na = Number(counts.slice(0, 3));
  const nb = Number(counts.slice(3, 6));
  const atoms: Atom[] = [];
  for (let i = 0; i < na; i++) {
    const l = lines[4 + i];
    atoms.push({ x: Number(l.slice(0, 10)), y: Number(l.slice(10, 20)), z: Number(l.slice(20, 30)), el: l.slice(31, 34).trim() });
  }
  const bonds: Bond[] = [];
  for (let i = 0; i < nb; i++) {
    const l = lines[4 + na + i];
    bonds.push([Number(l.slice(0, 3)) - 1, Number(l.slice(3, 6)) - 1, Number(l.slice(6, 9)), Number(l.slice(9, 12))]);
  }
  const field = (name: string) => {
    const at = lines.findIndex((x) => x.trim() === `> <${name}>`);
    return at >= 0 ? lines[at + 1].trim() : null;
  };
  return { atoms, bonds, field };
}

const round = (n: number) => Math.round(n * 1e4) / 1e4;

async function main() {
  const ids = MOLECULES.map((m) => m.cid).join(",");
  const propsUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${ids}/property/Title,MolecularFormula,MolecularWeight,IUPACName,IsomericSMILES/JSON`;
  const props = (await (await fetch(propsUrl)).json()).PropertyTable.Properties as Record<string, string | number>[];
  for (const m of MOLECULES) {
    const url3d = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${m.cid}/record/SDF?record_type=3d`;
    const url2d = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${m.cid}/record/SDF?record_type=2d`;
    const [s3, s2] = await Promise.all([fetch(url3d).then((r) => r.text()), fetch(url2d).then((r) => r.text())]);
    const d3 = parseSdf(s3);
    const d2 = parseSdf(s2);
    const p = props.find((x) => x.CID === m.cid)!;
    const out = {
      name: p.Title,
      cid: m.cid,
      formula: p.MolecularFormula,
      molecularWeight: p.MolecularWeight,
      iupacName: p.IUPACName,
      smiles: p.SMILES ?? p.IsomericSMILES,
      source: {
        page: `https://pubchem.ncbi.nlm.nih.gov/compound/${m.cid}`,
        conformer3d: url3d,
        depiction2d: url2d,
        retrieved: new Date().toISOString().slice(0, 10),
        conformerId: d3.field("PUBCHEM_CONFORMER_ID"),
        notes:
          "3D coordinates are PubChem's computed conformer (MMFF94s force field), in ångströms. 2D coordinates are PubChem's depiction layout. Public domain (NCBI/NLM).",
      },
      atoms3d: d3.atoms.map((a) => ({ el: a.el, x: round(a.x), y: round(a.y), z: round(a.z) })),
      bonds3d: d3.bonds.map(([a, b, o]) => [a, b, o]),
      atoms2d: d2.atoms.map((a) => ({ el: a.el, x: round(a.x), y: round(a.y) })),
      bonds2d: d2.bonds,
    };
    const file = path.join("src/content/molecules", `${m.slug}.json`);
    writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
    console.log(`${file}: ${out.name} ${out.formula}, ${out.atoms3d.length} atoms, ${out.bonds3d.length} bonds, conformer ${out.source.conformerId}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
