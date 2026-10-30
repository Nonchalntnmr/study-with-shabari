import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ANATOMY, ANATOMY_CREDIT } from "@/lib/explore/anatomy-regions";
import { pickMap } from "@/lib/explore/types";

describe("Stage 4 organ systems explorer config and assets", () => {
  it("defines all nine major MCAT organ regions across cardiopulmonary, digestive, and renal groups", () => {
    const ids = ANATOMY.regions.map((r) => r.id);
    for (const req of [
      "heart",
      "lungs",
      "spleen",
      "liver",
      "pancreas",
      "small-intestine",
      "large-intestine",
      "kidneys",
      "urinary-bladder",
    ]) {
      expect(ids).toContain(req);
    }
    const pm = pickMap(ANATOMY);
    expect(pm.get("thoracic")?.get("M.heart")).toBe("heart");
    expect(pm.get("abdominal")?.get("L.kidney")).toBe("kidneys");
    expect(pm.get("abdominal")?.get("R.kidney")).toBe("kidneys");
  });

  it("embeds CC BY 4.0 copyright in the binary GLB assets and stays under the mobile transfer budget", () => {
    expect(ANATOMY.assets.mobile.gzBytes).toBeLessThan(1_500_000);
    for (const tier of ["mobile", "desktop"] as const) {
      const gzRel = ANATOMY.assets[tier].gz.replace(/^\//, "");
      const glbRel = gzRel.replace(/\.gz$/, "");
      const glbBuf = fs.readFileSync(path.join(process.cwd(), "public", glbRel));
      const jsonLen = glbBuf.readUInt32LE(12);
      const jsonStr = glbBuf.subarray(20, 20 + jsonLen).toString("utf8");
      const gltf = JSON.parse(jsonStr);
      expect(gltf.asset.copyright).toContain("CC BY 4.0");
      expect(gltf.asset.copyright).toContain("HuBMAP");
      expect(gltf.extensionsRequired).toContain("KHR_mesh_quantization");
    }
    expect(ANATOMY_CREDIT.short).toContain("CC BY 4.0");
  });

  it("logs every new organ sentence in docs/STAGE-TEXT-FOR-SHABARI.md", () => {
    const log = fs.readFileSync(path.join(process.cwd(), "docs/STAGE-TEXT-FOR-SHABARI.md"), "utf8");
    for (const r of ANATOMY.regions) {
      for (const n of r.note) expect(log, `note in ${r.id}`).toContain(n);
    }
  });
});
