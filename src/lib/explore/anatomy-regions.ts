import assets from "./anatomy-assets.json";
import type { ExplorerConfig, ExplorerRegion } from "./types";

const THORACIC = new Set(["heart", "lungs", "spleen"]);

const C = {
  vermilion: "#D55E00",
  sky: "#56B4E9",
  violet: "#8B7FD1",
  teal: "#009E73",
  orange: "#E69F00",
  yellow: "#E8D44D",
  pink: "#CC79A7",
  sand: "#C9A15A",
  blue: "#0072B2",
};

const regions: ExplorerRegion[] = [
  // ---- Cardiopulmonary & Lymphatic ----
  {
    id: "heart",
    name: "Heart",
    group: "cardiopulmonary",
    layer: "thoracic",
    atoms: ["M.heart"],
    color: C.vermilion,
    view: [0.25, 0.15, 0.95],
    note: [
      "The heart pumps deoxygenated blood from the right ventricle to the lungs and oxygenated blood from the left ventricle to the body.",
      "Pacemaker cells in the sinoatrial (SA) node set the heart rate, conducted through the AV node, bundle of His and Purkinje fibers.",
    ],
    related: ["lungs", "kidneys"],
  },
  {
    id: "lungs",
    name: "Lungs and bronchi",
    group: "cardiopulmonary",
    layer: "thoracic",
    atoms: ["M.lungs"],
    color: C.sky,
    view: [0.35, 0.2, 0.9],
    note: [
      "Gas exchange occurs across thin alveolar membranes by passive diffusion: oxygen enters pulmonary capillaries while carbon dioxide leaves.",
      "The lungs also buffer blood pH through the bicarbonate buffer system by adjusting ventilation rate.",
    ],
    related: ["heart", "kidneys"],
  },
  {
    id: "spleen",
    name: "Spleen",
    group: "cardiopulmonary",
    layer: "thoracic",
    atoms: ["L.spleen"],
    color: C.violet,
    view: [0.75, 0.15, 0.65],
    note: [
      "The spleen sits in the upper left abdomen; its red pulp filters aged red blood cells and recycles iron.",
      "Its white pulp houses B cells and T cells that mount adaptive immune responses against blood-borne pathogens.",
    ],
    related: ["liver"],
  },

  // ---- Digestive & Endocrine ----
  {
    id: "liver",
    name: "Liver",
    group: "digestive",
    layer: "abdominal",
    atoms: ["R.liver"],
    color: C.teal,
    view: [-0.45, 0.15, 0.88],
    note: [
      "The liver maintains blood glucose through glycogenesis, glycogenolysis and gluconeogenesis, and converts toxic ammonia into urea.",
      "It synthesizes bile salts for fat emulsification as well as plasma proteins such as albumin and clotting factors.",
    ],
    related: ["pancreas", "small-intestine", "kidneys"],
  },
  {
    id: "pancreas",
    name: "Pancreas",
    group: "digestive",
    layer: "abdominal",
    atoms: ["M.pancreas"],
    color: C.yellow,
    view: [0.2, 0.05, 0.95],
     xray: true,
    note: [
      "The exocrine pancreas secretes bicarbonate to neutralize stomach acid and digestive enzymes (amylase, lipase, trypsinogen and chymotrypsinogen) into the duodenum.",
      "Endocrine islets of Langerhans release insulin from beta cells to lower blood glucose and glucagon from alpha cells to raise it.",
    ],
    related: ["small-intestine", "liver"],
  },
  {
    id: "small-intestine",
    name: "Small intestine",
    group: "digestive",
    layer: "abdominal",
    atoms: ["M.small_intestine"],
    color: C.pink,
    view: [0.15, -0.1, 0.98],
    note: [
      "The duodenum completes chemical digestion using pancreatic enzymes and bile, and releases secretin and cholecystokinin (CCK).",
      "The jejunum and ileum absorb sugars, amino acids, fatty acids (into lacteals as chylomicrons) and vitamin B12 across villi and microvilli.",
    ],
    related: ["pancreas", "liver", "large-intestine"],
  },
  {
    id: "large-intestine",
    name: "Large intestine (colon)",
    group: "digestive",
    layer: "abdominal",
    atoms: ["M.large_intestine"],
    color: C.sand,
    view: [0.25, -0.15, 0.95],
    note: [
      "The large intestine absorbs remaining water and electrolytes (sodium and chloride) to concentrate indigestible material into feces.",
      "Commensal gut bacteria ferment fiber and synthesize vitamin K and biotin.",
    ],
    related: ["small-intestine", "kidneys"],
  },

  // ---- Renal ----
  {
    id: "kidneys",
    name: "Kidneys",
    group: "renal",
    layer: "abdominal",
    atoms: ["L.kidney", "R.kidney"],
    color: C.blue,
    view: [0.3, 0.05, -0.95],
    xray: true,
    note: [
      "Each kidney filters blood plasma at the glomerulus, reabsorbs water, glucose, amino acids and ions along the nephron, and secretes wastes and H+ or HCO3- to regulate blood pH.",
      "Aldosterone increases Na+ reabsorption and K+ secretion in the distal nephron, while antidiuretic hormone (ADH) inserts aquaporin-2 channels in the collecting duct.",
    ],
    related: ["urinary-bladder", "heart", "lungs", "liver"],
  },
  {
    id: "urinary-bladder",
    name: "Urinary bladder",
    group: "renal",
    layer: "abdominal",
    atoms: ["M.urinary_bladder"],
    color: C.orange,
    view: [0.2, -0.25, 0.95],
    note: [
      "The urinary bladder stores urine received from the ureters; its wall is lined by transitional epithelium (urothelium) surrounded by detrusor smooth muscle.",
      "Micturition pairs parasympathetic detrusor contraction and internal urethral sphincter relaxation with voluntary somatic relaxation of the external urethral sphincter.",
    ],
    related: ["kidneys"],
  },
];

export const ANATOMY: ExplorerConfig = {
  id: "anatomy",
  modelName: "3D organ systems",
  groups: [
    { id: "cardiopulmonary", label: "Cardiopulmonary & lymphatic" },
    { id: "digestive", label: "Digestive & endocrine" },
    { id: "renal", label: "Renal & fluid balance" },
  ],
  layers: [
    {
      id: "all",
      label: "All systems",
      modes: {},
      still: {
        src: "/images/explore/anatomy-all.png",
        alt: "3D reference view of the thoracic and abdominal organs: heart, lungs, liver, pancreas, spleen, kidneys, urinary bladder, and intestines.",
      },
    },
    {
      id: "thoracic",
      label: "Cardiopulmonary",
      modes: { abdominal: "ghost" },
      still: {
        src: "/images/explore/anatomy-thoracic.png",
        alt: "3D reference view highlighting the heart, lungs, and spleen.",
      },
    },
    {
      id: "abdominal",
      label: "Digestive & renal",
      modes: { thoracic: "ghost" },
      still: {
        src: "/images/explore/anatomy-abdominal.png",
        alt: "3D reference view highlighting the liver, pancreas, small and large intestines, kidneys, and urinary bladder.",
      },
    },
  ],
  regions,
  atomClass: (atom) => {
    const base = atom.split(".")[1];
    return THORACIC.has(base) ? "thoracic" : "abdominal";
  },
  xrayClasses: ["thoracic", "abdominal"],
  defaultView: [0.25, 0.1, 0.95],
  defaultLayer: "all",
  assets: { mobile: assets.tiers.mobile, desktop: assets.tiers.desktop },
  neutral: "#D9DEE7",
};

export const ANATOMY_CREDIT = {
  short:
    "3D organ systems adapted from the HuBMAP Human Reference Atlas 3D Reference Organs for Heart, Lung, Spleen, Liver, Pancreas, Small Intestine, Large Intestine, Kidneys, and Urinary Bladder (Kristen Browne and Heidi Schlehlein, HuBMAP CCF; licensed under CC BY 4.0). Modified by Study with Shabari.",
};
