import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BRAIN, BRAIN_CREDIT } from "@/lib/explore/brain-regions";
import { pickMap, regionById } from "@/lib/explore/types";

describe("Stage 3 brain explorer config and assets", () => {
  it("defines all required lobes, cortical areas, deep structures and hindbrain regions", () => {
    const ids = BRAIN.regions.map((r) => r.id);
    for (const req of [
      "frontal-lobe",
      "parietal-lobe",
      "temporal-lobe",
      "occipital-lobe",
      "insula",
      "limbic-lobe",
      "brocas-area",
      "wernickes-area",
      "prefrontal-cortex",
      "motor-cortex",
      "somatosensory-cortex",
      "hippocampus",
      "amygdala",
      "thalamus",
      "hypothalamus",
      "basal-ganglia",
      "striatum",
      "nucleus-accumbens",
      "substantia-nigra",
      "vta",
      "corpus-callosum",
      "cerebellum",
      "brainstem",
      "midbrain",
      "pons",
      "medulla",
    ]) {
      expect(ids).toContain(req);
    }
    const pm = pickMap(BRAIN);
    expect(pm.get("lobes")?.get("L.pfc")).toBe("frontal-lobe");
    expect(pm.get("areas")?.get("L.ifg")).toBe("brocas-area");
    expect(pm.get("areas")?.get("L.stgp")).toBe("wernickes-area");
    expect(pm.get("deep")?.get("L.hipp")).toBe("hippocampus");
    expect(regionById(BRAIN, "vta")?.approximate).toBeTruthy();
  });

  it("embeds CC BY 4.0 copyright in the binary GLB assets and stays under the mobile transfer budget", () => {
    expect(BRAIN.assets.mobile.gzBytes).toBeLessThan(1_500_000);
    for (const tier of ["mobile", "desktop"] as const) {
      const gzRel = BRAIN.assets[tier].gz.replace(/^\//, "");
      const glbRel = gzRel.replace(/\.gz$/, "");
      const glbBuf = fs.readFileSync(path.join(process.cwd(), "public", glbRel));
      const jsonLen = glbBuf.readUInt32LE(12);
      const jsonStr = glbBuf.subarray(20, 20 + jsonLen).toString("utf8");
      const gltf = JSON.parse(jsonStr);
      expect(gltf.asset.copyright).toContain("CC BY 4.0");
      expect(gltf.asset.copyright).toContain("Allen Institute for Brain Science");
      expect(gltf.extensionsRequired).toContain("KHR_mesh_quantization");
    }
    expect(BRAIN_CREDIT.short).toContain("CC BY 4.0");
  });

  it("logs every new region sentence in docs/STAGE-TEXT-FOR-SHABARI.md and uses verbatim dopamine lesson quotes", () => {
    const log = fs.readFileSync(path.join(process.cwd(), "docs/STAGE-TEXT-FOR-SHABARI.md"), "utf8");
    const dopPage = fs.readFileSync(path.join(process.cwd(), "src/app/(site)/dopamine/page.tsx"), "utf8").replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
    for (const r of BRAIN.regions) {
      for (const n of r.note) expect(log, `note in ${r.id}`).toContain(n);
      if (r.approximate) expect(log, `approx in ${r.id}`).toContain(r.approximate);
      for (const l of r.lesson ?? []) expect(dopPage, `lesson quote in ${r.id}`).toContain(l);
    }
  });
});
