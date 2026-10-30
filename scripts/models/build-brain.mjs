// Builds the brain explorer's two mesh tiers from the HuBMAP HRA "3D Reference Organ for Brain, Male v1.3"
// (CC BY 4.0; itself the Allen Human Reference Atlas – 3D, 2020, CC BY 4.0). Scripted end to end so the
// output can be regenerated; nothing is edited by hand. What it changes is listed in CHANGES below and
// copied into every output file's asset.extras and into ATTRIBUTION.txt.
//
//   GLTF_TOOLS=<dir with @gltf-transform/core@4, @gltf-transform/extensions@4, meshoptimizer> \
//   node scripts/models/build-brain.mjs <path to 3d-vh-m-allen-brain.glb>
//
// The tools are installed outside the repo (npm i --prefix <dir> ...); they are not dependencies of the site.
// No WebAssembly decoder is needed at runtime: the output uses KHR_mesh_quantization only, and the .glb.gz
// copies are decompressed in the browser with DecompressionStream (the CSP has no 'wasm-unsafe-eval').
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const SRC = process.argv[2];
const TOOLS = process.env.GLTF_TOOLS;
if (!SRC || !TOOLS) throw new Error("usage: GLTF_TOOLS=<dir> node scripts/models/build-brain.mjs <source.glb>");
const need = createRequire(path.join(TOOLS, "package.json"));
const load = (id) => import(pathToFileURL(need.resolve(id)).href);
const { NodeIO, Document } = await load("@gltf-transform/core");
const { KHRMeshQuantization } = await load("@gltf-transform/extensions");
const { MeshoptSimplifier, MeshoptEncoder } = await load("meshoptimizer");
await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;

const SOURCE_URL = "https://cdn.humanatlas.io/digital-objects/ref-organ/brain-male/v1.3/assets/3d-vh-m-allen-brain.glb";
const SOURCE_SHA256 = "2b9ad5b53e40e9f0936da74f7be38d2eed15604e26358c3870a0ea13499b9a35";
const OUT = "public/models/brain/v1";
const MANIFEST = "src/lib/explore/brain-assets.json";

const sha = createHash("sha256").update(readFileSync(SRC)).digest("hex");
if (sha !== SOURCE_SHA256) throw new Error(`source checksum ${sha} is not the pinned ${SOURCE_SHA256}`);

// Eight meshes per hemisphere carry each other's names in v1.3. Checked against the Allen voxel atlas the
// meshes were made from (scripts/models/verify-brain-names.py): each mesh's centroid lies within 1.7 mm of the
// renamed structure's centroid, and its volume is 1.00–1.02 times that structure's voxel volume.
const RENAME = {
  atrium_of_lateral_ventricle: "rostral_gyrus",
  frontal_pole: "optic_radiation",
  frontomarginal_gyrus: "perirhinal_gyrus_rostral_part_of_FuGt",
  optic_radiation: "posteroventral_putamen",
  paracingulate_gyrus: "frontomarginal_gyrus",
  perirhinal_gyrus_rostral_part_of_FuGt: "atrium_of_lateral_ventricle",
  posteroventral_putamen: "paracingulate_gyrus",
  rostral_gyrus: "frontal_pole",
};

// Display atoms: the finest pieces the explorer needs. Each is the union of these source structures
// (Allen names, without the "Allen_" prefix and the side suffix). "mid" atoms join both sides into one mesh.
const ATOMS = {
  pfc: ["superior_frontal_gyrus", "middle_frontal_gyrus", "gyrus_rectus_straight_gyrus", "medial_orbital_gyrus", "anterior_intermediate_orbital_gyrus", "posterior_intermediate_orbital_gyrus", "lateral_orbital_gyrus", "frontal_operculum", "paracingulate_gyrus", "rostral_gyrus", "frontomarginal_gyrus", "frontal_pole"],
  ifg: ["inferior_frontal_gyrus_triangular_part", "inferior_frontal_gyrus_opercular_part"],
  m1: ["precentral_gyrus", "paracentral_lobule_rostral_part"],
  s1: ["postcentral_gyrus", "paracentral_lobule_caudal_part"],
  par: ["supraparietal_lobule", "supramarginal_gyrus", "angular_gyrus", "precuneus", "parietal_operculum"],
  stgp: ["superior_temporal_gyrus:posterior", "planum_temporale"],
  temp: ["superior_temporal_gyrus:anterior", "middle_temporal_gyrus", "inferior_temporal_gyrus", "occipitotemporal_fusiform_gyrus_temporal_part", "transverse_temporal_gyrus_Heschls_gyrus", "temporal_pole", "planum_polare", "perirhinal_gyrus_rostral_part_of_FuGt"],
  occ: ["occipital_pole", "cuneus", "lingual_gyrus_medial_occipitotemporal_gyrus", "lateral_occipitotemporal_fusiform_gyrus_occipital_part", "inferior_occipital_gyrus", "superior_occipital_gyrus"],
  ins: ["long_insular_gyri", "short_insular_gyri", "limen_insula", "frontal_agranular_insular_cortex_area_Fl", "temporal_agranular_insular_cortex_area_Tl"],
  cing: ["cingulate_gyrus_rostral_anterior_part", "cingulate_gyrus_caudal_posterior_part", "ingulo_parahippocampal_isthmus", "subcallosal_gyrus_parolfactory_gyrus", "anterior_parahippocampal_gyrus", "posterior_parahippocampal_gyrus", "gyrus_ambiens"],
  olf: ["olfactory_bulb", "anterior_olfactory_nucleus", "piriform_region", "olfactory_tract", "lateral_olfactory_gyrus"],
  hipp: ["head_of_hippocampus", "body_of_hippocampus", "tail_of_hippocampus"],
  amy: ["amygdaloid_complex", "anterior_amygdaloid_area", "central_nuclear_group", "lateral_nucleus", "basolateral_nucleus_basal_nucleus", "basomedial_nucleus_accessory_basal_nucleus", "anterior_cortical_nucleus", "posterior_cortical_nucleus", "medial_nucleus", "amygdalohippocampal_area"],
  thal: ["thalamus", "anterior_nuclear_complex_of_thalamus", "lateral_dorsal_nucleus_of_thalamus", "mediodorsal_nucleus_of_thalamus", "reuniens_nucleus_medioventral_nucleus_of_thalamus", "lateral_posterior_nucleus_of_thalamus", "pulvinar_of_thalamus", "ventral_anterior_nucleus_of_thalamus", "ventral_lateral_nucleus_of_thalamus", "ventral_posterior_lateral_nucleus", "ventral_posterior_medial_nucleus", "dorsal_lateral_geniculate_nucleus", "medial_geniculate_nuclei", "centromedian_nucleus_of_thalamus", "parafascicular_nucleus_of_thalamus", "midline_nuclear_complex"],
  hth: ["hypothalamus", "supraoptic_region_of_HTH", "preoptic_region_of_HTH", "tuberal_region_of_HTH", "mammillary_region_of_HTH"],
  caud: ["head_of_caudate", "body_of_caudate", "tail_of_caudate"],
  put: ["putamen", "posteroventral_putamen"],
  nac: ["nucleus_accumbens"],
  gp: ["external_segment_of_globus_pallidus", "internal_segment_of_globus_pallidus"],
  stn: ["subthalamic_nucleus"],
  sn: ["substantia_nigra"],
  cb: ["cerebellar_vermis", "paravermis_of_cerebellum", "lateral_hemisphere_of_cerebellum"],
};
const MID_ATOMS = {
  cc: ["corpus_callosum"],
  mid: ["midbrain_tegmentum", "red_nucleus", "superior_colliculus", "inferior_colliculus", "pretectal_region", "cerebral_peduncle_crus_cerebri"],
  pons: ["basilar_part_of_pons", "pontine_tegmentum", "middle_cerebellar_peduncle", "superior_cerebellar_peduncle_brachium_conjunctivum"],
  med: ["pyramidal_part_of_medulla_oblongata", "tegmentum_of_medulla_oblongata", "inferior_olive", "inferior_cerebellar_peduncle"],
};
// Left out: inside the brain and never shown (white matter, ventricles, tracts, small nuclei), and the
// optic chiasm, which comes from the Visible Human model rather than the Allen atlas.
const DROPPED = ["white_matter_of_forebrain", "white_matter_of_hindbrain", "anterior_horn_of_lateral_ventricle", "body_of_lateral_ventricle", "posterior_horn_of_lateral_ventricle", "inferior_horn_of_lateral_ventricle", "atrium_of_lateral_ventricle", "third_ventricle", "fourth_ventricle", "central_canal_of_medulla_oblongata", "cerebral_aqueduct", "fornix", "anterior_commissure", "mammillothalamic_tract", "optic_tract", "optic_radiation", "claustrum", "basal_forebrain", "septal_nuclei", "bed_nucleus_of_stria_terminalis", "habenular_nuclei", "pineal_body", "zona_incerta", "cerebellar_deep_nuclei", "VH_M_optic_chiasm"];

// Triangle share kept per tier. Small structures keep at least `floor` triangles so they keep their shape.
const TIERS = {
  mobile: { ratio: 0.2, floor: 160, error: 0.02 },
  desktop: { ratio: 0.55, floor: 400, error: 0.006 },
};

// Orientation. The source is a mirror image of the anatomy (its frame has determinant −1 against MNI space,
// fitted from 280 structure centroids) and is pitched by about 18°. Mirror x, then rotate so that x points to
// the subject's left, y up (superior) and z forward (anterior): glTF's right-handed, +Y up, +Z front convention.
const ANTERIOR = norm([0, 0.31, 0.95]); // source-frame direction of MNI +A (from the fit), after mirroring x
const SUPERIOR = norm([0, 0.96, -0.31]); // source-frame direction of MNI +S
function norm(v) {
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
}
const S_ORTHO = norm(SUPERIOR.map((s, i) => s - ANTERIOR[i] * (SUPERIOR[0] * ANTERIOR[0] + SUPERIOR[1] * ANTERIOR[1] + SUPERIOR[2] * ANTERIOR[2])));
const LEFT = [S_ORTHO[1] * ANTERIOR[2] - S_ORTHO[2] * ANTERIOR[1], S_ORTHO[2] * ANTERIOR[0] - S_ORTHO[0] * ANTERIOR[2], S_ORTHO[0] * ANTERIOR[1] - S_ORTHO[1] * ANTERIOR[0]];
const toBrain = (x, y, z) => {
  const mx = -x; // mirror
  return [LEFT[0] * mx + LEFT[1] * y + LEFT[2] * z, S_ORTHO[0] * mx + S_ORTHO[1] * y + S_ORTHO[2] * z, ANTERIOR[0] * mx + ANTERIOR[1] * y + ANTERIOR[2] * z];
};

const CHANGES = [
  "Converted from the HRA brain-male v1.3 GLB (Allen Human Reference Atlas 3D meshes).",
  "Corrected eight swapped mesh names per hemisphere (checked against the Allen voxel atlas by centroid and volume).",
  "Mirrored left-right and rotated about 18 degrees so the left hemisphere is on the subject's left, superior is +Y and anterior is +Z; recentred; units stay metres.",
  "Grouped atlas structures into display regions (one mesh per region and side; brainstem parts and corpus callosum join both sides).",
  "Split the superior temporal gyrus at the anterior edge of Heschl's gyrus (the posterior part plus the planum temporale approximates Wernicke's area).",
  "Dropped internal structures (white matter, ventricles, tracts, small nuclei) and the Visible Human optic chiasm.",
  "Simplified (meshoptimizer), removed normals (recomputed in the browser), quantized positions (KHR_mesh_quantization) and recoloured.",
];
const COPYRIGHT =
  "3D brain adapted from the HuBMAP HRA 3D Reference Organ for Brain, Male v1.3 (Kristen Browne, Heidi Schlehlein, 2023, https://doi.org/10.48539/HBM929.XKCL.339, CC BY 4.0), derived from the Allen Human Reference Atlas – 3D, 2020 (RRID:SCR_017764, © 2019 Allen Institute for Brain Science, CC BY 4.0). Modified by Study with Shabari: simplified, regrouped, recoloured. https://creativecommons.org/licenses/by/4.0/";

// ---- read the source ----
const io = new NodeIO().registerExtensions([KHRMeshQuantization]);
const src = await io.read(SRC);
const structures = new Map(); // "<name>|L" -> { pos: Float32Array (brain frame), idx: Uint32Array }
for (const node of src.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const raw = node.getName();
  const m = /^Allen_(.+)_([LR])$/.exec(raw);
  const base = m ? m[1] : raw;
  const side = m ? m[2] : "";
  const name = RENAME[base] ?? base;
  const prim = mesh.listPrimitives()[0];
  const p = prim.getAttribute("POSITION").getArray();
  const pos = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 3) pos.set(toBrain(p[i], p[i + 1], p[i + 2]), i);
  const ind = prim.getIndices().getArray();
  const idx = new Uint32Array(ind.length);
  // Mirroring reverses the winding; swap two corners to keep faces pointing outward.
  for (let i = 0; i < ind.length; i += 3) {
    idx[i] = ind[i];
    idx[i + 1] = ind[i + 2];
    idx[i + 2] = ind[i + 1];
  }
  structures.set(`${name}|${side}`, { pos, idx });
}

// Every source structure must be used or dropped, exactly once.
const used = new Set([...Object.values(ATOMS), ...Object.values(MID_ATOMS)].flat().map((n) => n.split(":")[0]));
for (const key of structures.keys()) {
  const n = key.split("|")[0];
  if (!used.has(n) && !DROPPED.includes(n)) throw new Error(`unassigned source structure ${key}`);
}

// Weld identical positions so the simplifier sees one connected surface.
function weld(pos, idx) {
  const map = new Map();
  const out = [];
  const remap = new Uint32Array(pos.length / 3);
  for (let i = 0; i < pos.length / 3; i++) {
    const k = `${pos[3 * i].toFixed(7)},${pos[3 * i + 1].toFixed(7)},${pos[3 * i + 2].toFixed(7)}`;
    let j = map.get(k);
    if (j === undefined) {
      j = out.length / 3;
      map.set(k, j);
      out.push(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]);
    }
    remap[i] = j;
  }
  const ni = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = remap[idx[t]], b = remap[idx[t + 1]], c = remap[idx[t + 2]];
    if (a !== b && b !== c && a !== c) ni.push(a, b, c);
  }
  return { pos: new Float32Array(out), idx: new Uint32Array(ni) };
}

function concat(parts) {
  let nv = 0, ni = 0;
  for (const p of parts) {
    nv += p.pos.length;
    ni += p.idx.length;
  }
  const pos = new Float32Array(nv), idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const p of parts) {
    pos.set(p.pos, ov);
    for (let i = 0; i < p.idx.length; i++) idx[oi + i] = p.idx[i] + ov / 3;
    ov += p.pos.length;
    oi += p.idx.length;
  }
  return { pos, idx };
}

// The anterior edge of Heschl's gyrus, per side, along +Z (anterior).
const heschl = {};
for (const side of ["L", "R"]) {
  const t = structures.get(`transverse_temporal_gyrus_Heschls_gyrus|${side}`);
  let max = -Infinity;
  for (let i = 2; i < t.pos.length; i += 3) max = Math.max(max, t.pos[i]);
  heschl[side] = max;
}
function part(name, side) {
  const [base, half] = name.split(":");
  const s = structures.get(`${base}|${side}`);
  if (!s) throw new Error(`missing ${base}|${side}`);
  if (!half) return s;
  const keep = [];
  for (let t = 0; t < s.idx.length; t += 3) {
    const z = (s.pos[3 * s.idx[t] + 2] + s.pos[3 * s.idx[t + 1] + 2] + s.pos[3 * s.idx[t + 2] + 2]) / 3;
    if ((z < heschl[side]) === (half === "posterior")) keep.push(s.idx[t], s.idx[t + 1], s.idx[t + 2]);
  }
  return { pos: s.pos, idx: new Uint32Array(keep) };
}

const atoms = []; // { id, pos, idx }
for (const [id, names] of Object.entries(ATOMS)) for (const side of ["L", "R"]) atoms.push({ id: `${side}.${id}`, ...weld(...Object.values(concat(names.map((n) => part(n, side))))) });
for (const [id, names] of Object.entries(MID_ATOMS)) atoms.push({ id: `M.${id}`, ...weld(...Object.values(concat(names.flatMap((n) => ["L", "R"].map((s) => part(n, s)))))) });

// Recentre on the bounding box of everything kept.
const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
for (const a of atoms) for (let i = 0; i < a.pos.length; i++) {
  lo[i % 3] = Math.min(lo[i % 3], a.pos[i]);
  hi[i % 3] = Math.max(hi[i % 3], a.pos[i]);
}
const centre = lo.map((l, i) => (l + hi[i]) / 2);
for (const a of atoms) for (let i = 0; i < a.pos.length; i++) a.pos[i] -= centre[i % 3];
const size = hi.map((h, i) => h - lo[i]);

// The VTA isn't segmented in the atlas: an approximate marker just medial to each substantia nigra, at its level.
const MM = 0.000935; // metres per atlas millimetre in this asset (fitted scale)
const vta = {};
for (const side of ["L", "R"]) {
  const sn = atoms.find((a) => a.id === `${side}.sn`).pos;
  const verts = [];
  for (let i = 0; i < sn.length; i += 3) verts.push([sn[i], sn[i + 1], sn[i + 2]]);
  verts.sort((a, b) => Math.abs(a[0]) - Math.abs(b[0]));
  const medial = verts.slice(0, Math.max(3, Math.round(verts.length * 0.15)));
  const c = [0, 1, 2].map((k) => medial.reduce((s, v) => s + v[k], 0) / medial.length);
  const sign = Math.sign(c[0]) || (side === "L" ? 1 : -1);
  c[0] = sign * Math.max(1.5 * MM, Math.abs(c[0]) - 2 * MM);
  vta[side] = c.map((x) => +x.toFixed(5));
}

// ---- build each tier ----
function simplify(a, tier) {
  const tris = a.idx.length / 3;
  const target = Math.min(tris, Math.max(tier.floor, Math.round(tris * tier.ratio)));
  let idx = a.idx;
  if (target < tris) [idx] = MeshoptSimplifier.simplify(a.idx, a.pos, 3, target * 3, tier.error, []);
  // Vertex cache and fetch order (smaller after gzip), then drop unused vertices.
  const [remap, unique] = MeshoptEncoder.reorderMesh(new Uint32Array(idx), true, false);
  const pos = new Float32Array(unique * 3);
  for (let i = 0; i < remap.length; i++) if (remap[i] !== 0xffffffff) pos.set(a.pos.subarray(3 * i, 3 * i + 3), 3 * remap[i]);
  const out = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) out[i] = remap[idx[i]];
  return { pos, idx: out };
}

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (/^brain-(mobile|desktop)\./.test(f)) rmSync(path.join(OUT, f));
const manifest = { source: { url: SOURCE_URL, sha256: SOURCE_SHA256 }, size: size.map((x) => +x.toFixed(4)), vta, tiers: {} };
for (const [tierName, tier] of Object.entries(TIERS)) {
  const doc = new Document();
  doc.createExtension(KHRMeshQuantization).setRequired(true);
  const buffer = doc.createBuffer();
  const scene = doc.createScene("brain");
  const asset = doc.getRoot().getAsset();
  asset.copyright = COPYRIGHT;
  asset.generator = "study-with-shabari scripts/models/build-brain.mjs";
  doc.getRoot().setExtras({ license: "https://creativecommons.org/licenses/by/4.0/", source: SOURCE_URL, sourceSha256: SOURCE_SHA256, upstream: "Allen Human Reference Atlas – 3D, 2020 (RRID:SCR_017764)", changes: CHANGES, tier: tierName });
  let triangles = 0;
  for (const a of atoms) {
    const s = simplify(a, tier);
    triangles += s.idx.length / 3;
    // Quantize positions to normalized int16 inside the atom's own box; the node transform restores metres.
    const lo3 = [Infinity, Infinity, Infinity], hi3 = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < s.pos.length; i++) {
      lo3[i % 3] = Math.min(lo3[i % 3], s.pos[i]);
      hi3[i % 3] = Math.max(hi3[i % 3], s.pos[i]);
    }
    const mid = lo3.map((l, i) => (l + hi3[i]) / 2);
    const half = Math.max(...hi3.map((h, i) => (h - lo3[i]) / 2)) || 1e-6;
    const q = new Int16Array(s.pos.length);
    for (let i = 0; i < s.pos.length; i++) q[i] = Math.round(((s.pos[i] - mid[i % 3]) / half) * 32767);
    const position = doc.createAccessor().setType("VEC3").setArray(q).setNormalized(true).setBuffer(buffer);
    const indices = doc.createAccessor().setType("SCALAR").setArray(s.pos.length / 3 < 65536 ? new Uint16Array(s.idx) : s.idx).setBuffer(buffer);
    const prim = doc.createPrimitive().setAttribute("POSITION", position).setIndices(indices);
    const mesh = doc.createMesh(a.id).addPrimitive(prim);
    const node = doc.createNode(a.id).setMesh(mesh).setTranslation(mid).setScale([half, half, half]).setExtras({ atom: a.id });
    scene.addChild(node);
  }
  const glb = Buffer.from(await io.writeBinary(doc));
  const hash = createHash("sha256").update(glb).digest("hex").slice(0, 8);
  const file = `brain-${tierName}.${hash}.glb`;
  const gz = gzipSync(glb, { level: 9 });
  writeFileSync(path.join(OUT, file), glb);
  writeFileSync(path.join(OUT, `${file}.gz`), gz);
  manifest.tiers[tierName] = { glb: `/models/brain/v1/${file}`, gz: `/models/brain/v1/${file}.gz`, bytes: glb.length, gzBytes: gz.length, triangles, meshes: atoms.length };
  console.log(tierName, file, "triangles", triangles, "bytes", glb.length, "gz", gz.length);
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(path.join(OUT, "CHANGES.txt"), CHANGES.map((c) => `- ${c}`).join("\n") + "\n");
console.log("manifest", MANIFEST);
