# Brain Explorer: asset licensing and implementation plan

For studywithshabari.com (Next.js 16.4, React 19.3, three 0.182, @react-three/fiber 9.8, motion 14, no drei, no gsap, Vercel).
Prepared 2026-10-30. Research only: no repository was modified and nothing was installed.

Every licence below was read from the licence text or the publisher's own page. The raw pages and small samples are saved under
`/private/tmp/claude-501/-Users-nishnathrevuri-utd-noel-bennty-/2a4c5651-9cd9-4acf-8001-55f3942f8bb9/scratchpad/stage3/dl/`.
Where a fact comes from my own measurement of a downloaded sample, it says "measured". Where something could not be checked, it says "not verified". This is an engineering reading of the licences, not legal advice.

---

## 1. Recommendation

### Recommended: Allen Human Reference Atlas – 3D, 2020 (v1.0.0), meshed by our own scripted pipeline

**What it is.** A voxel parcellation of the adult human brain into 141 structures, drawn by neuroanatomist Song-Lin Ding on the ICBM 2009b Nonlinear Symmetric template, which averages 152 brains. It is adapted from his 2016 2D atlas (Ding et al., *J Comp Neurol* 524:3127–3481, doi:10.1002/cne.24080). Source: <http://download.alleninstitute.org/informatics-archive/allen_human_reference_atlas_3d_2020/version_1/>

**Licence decision: use it.** The README.pdf (the primary source, saved at `dl/allen/ahra3d-README.pdf`) says: *"These materials are now provided under the Attribution International 4.0 (CC BY 4.0) license as of Sept. 1, 2022."* Licence text: <https://creativecommons.org/licenses/by/4.0/legalcode>. The forum release post repeats this: <https://community.brain-map.org/t/allen-human-reference-atlas-3d-2020-new/405>.
- **Commercial use:** yes. CC BY 4.0 has no NC element.
- **Share-alike:** none. We may license our own adaptations as we choose, but we may not restrict anyone's CC BY rights in the Allen-derived material (§2(a)(5)(B)).
- **Modification:** allowed (meshing, decimation, splitting, recolouring). We must say that we modified it (§3(a)(1)(B)).
- **Attribution:** the README asks that citations follow the Allen Citation Policy (<https://alleninstitute.org/citation-policy/>). That policy says *"A citation must appear on the same page where the Allen Institute data or image appears."* So the credit line goes directly under the viewer, not only on a credits page.
- **Why the general Allen Terms of Use don't block this.** <https://alleninstitute.org/terms-of-use/> (updated 23 Oct 2026) is non-commercial by default. It says *"You may not redistribute the Content or Improvements for commercial purposes without our written permission"* and defines commercial use as including *"use of the Content to perform a commercial service for a third party."* Those terms apply *"unless otherwise stated,"* and the README states CC BY 4.0 for this resource. That makes HRA-3D usable while other Allen data, such as the Allen Human Brain Atlas donor data, is not.
- **Residual ambiguity, low:** the RRID record (SCR_017764) still links the generic Allen terms. Optional insurance is a one-line email to terms@alleninstitute.org asking them to confirm CC BY 4.0 for commercial educational display. Only Nishanth or Shabari should send it; I did not.

**Why this asset.**
- It is the only candidate whose region boundaries come from an expert atlas (not an illustrator) under a plain commercial-friendly licence.
- It covers almost every target structure as a separate label, including:
  - **Broca's area:** inferior frontal gyrus opercular and triangular parts, as separate labels.
  - **Basal ganglia and midbrain:** nucleus accumbens and substantia nigra.
  - **Lobes:** come from the atlas's own hierarchy.
- Details are in the coverage table below.

**Measured facts about the source file** (`annotation_full.nii.gz`, 1,815,762 bytes):
- **Grid:** 394×466×378 voxels at 0.5 mm, uint32 labels, 141 distinct labels, 13,963,410 labelled voxels.
- **Coordinates:** qform is identity with offset (−98, −134, −72) mm, so voxel coordinates are MNI RAS millimetres and the midline is x = 0 mm (voxel index 196).
- **Hemispheres:** `annotation.nii.gz` (1,117,842 bytes) is a single hemisphere. The "full" file mirrors it, so left and right are identical.
- **Stray voxels:** four voxels labelled 10368 (basolateral amygdala) sit at the volume corner (x≈380, z≈324). They are mirrored into the full file, and the pipeline must drop them.
- **Medulla:** the medulla reaches the inferior edge of the volume (z index 0 = −72 mm), so the caudal medulla is probably truncated. This needs a visual check.
- **Hindbrain white matter (label HWM):** 98.2% of its voxels are nearest to cerebellar labels (cerebellar white matter), so a nearest-label rule assigns it cleanly.

**Target-structure coverage** (Allen acronyms; bilateral unless noted):

| Target | Allen labels | Fidelity note |
|---|---|---|
| Frontal / parietal / temporal / occipital lobes | Parents FroL, ParL, TemL, OccL (17 / 7 / 9 / 6 leaf gyri) | Atlas-defined. Insula (InL) and limbic lobe (LimL: cingulate, parahippocampal, hippocampus) are separate lobes in this ontology. |
| Prefrontal cortex | No single label. Built from SFG, MFG, IFGtr, IFGop, orbital gyri (ReG, MOrG, AOrG, POrG, LOrG), FP, FMG, RoG, PaCG, FrO | **Approximation.** Gyral labels can't separate premotor BA6 from prefrontal cortex in posterior SFG/MFG. Must be labelled "approximate" and approved by Shabari. |
| Motor cortex | PrCG + PCLr (rostral paracentral lobule) | Gyral proxy for primary motor cortex (BA4 lies mostly in the anterior bank of the central sulcus). Caption should say so. |
| Sensory cortex | PoCG + PCLc | Gyral proxy for S1 (BA3/1/2). |
| Broca's area | IFGop + IFGtr | Good. These are the standard anatomical definition (pars opercularis + triangularis). Usually shown on the left. |
| Wernicke's area | STG (whole) and PLT (planum temporale) | **Approximation.** No posterior-STG label exists. Proposed rule: PLT + STG voxels posterior to the anterior edge of Heschl's gyrus (TTG). The rule is documented and needs Shabari's sign-off. |
| Hippocampus | HiH + HiB + HiT | Good. |
| Amygdala | AMY + 9 nuclei (La, BL, BM, CEN, CoA, CoP, Me, AHA, AAA) | Good. Merge for display. |
| Thalamus | THM + 14 nuclei (ANC, MD, VA, VL, VPL, VPM, Pul, LGN, MG …) | Good. Merge, with nuclei available later. |
| Hypothalamus | HTH + preoptic, supraoptic, tuberal, mammillary regions | Good. |
| Basal ganglia / striatum / NAc | CaH, CaB, CaT, Pu, PuPV, NAC (STR = these six); GPe, GPi | Good. Allen's striatum includes NAc. |
| Substantia nigra | SN | Good (no SNc/SNr split). |
| VTA | **Not segmented**; it lies inside MTg (midbrain tegmentum) | Gap. Show as an anchored marker inside MTg with an "approximate location, not separately segmented" note. See Risks. |
| Cerebellum | CBV, CBPV, CBL, CbDN (+ HWM by nearest-label rule) | Good. |
| Midbrain / pons / medulla | M: PTR, MTg, RN, SN, SC, IC, cpd, scp, Aq. Pn: PnBa, PnTg. Mo: MoPy, MoTg, IO | Good, apart from the caudal truncation noted above. |
| Corpus callosum | cc | Good. |

**Exact attribution string.** Show the short form under the viewer and the full form on `/credits`. Both are also embedded in the glTF `asset.copyright` and in `ATTRIBUTION.txt`.

Short form (same page as the viewer):

> 3D brain adapted from the Allen Human Reference Atlas – 3D, 2020 (v1.0.0, RRID:SCR_017764), © 2019 Allen Institute for Brain Science, licensed under CC BY 4.0. Modified by Study with Shabari. Full credits and changes: /credits

Full form (`/credits`):

> Brain region meshes are adapted from the Allen Human Reference Atlas – 3D, 2020, version 1.0.0 (RRID:SCR_017764). © 2019 Allen Institute for Brain Science. Dataset: Song-Lin Ding, Joshua J. Royall, Susan M. Sunkin, Benjamin A.C. Facer, Phil Lesnar, Amy Bernard, Lydia Ng, Ed S. Lein (2020), "Allen Human Reference Atlas – 3D, 2020," available from http://download.alleninstitute.org/informatics-archive/allen_human_reference_atlas_3d_2020/version_1/. Structure ontology: Ding S-L, Royall JJ, et al., Lein ES, "Comprehensive cellular-resolution atlas of the adult human brain," J Comp Neurol 524(16):3127–3481 (2016), doi:10.1002/cne.24080. Licensed under Creative Commons Attribution 4.0 International (https://creativecommons.org/licenses/by/4.0/); provided as-is, without warranties.
> Changes by Study with Shabari: the label volume was converted to surface meshes, smoothed, simplified, split into left and right hemispheres, recoloured, and grouped into display regions. Groupings such as "prefrontal cortex", "motor cortex", "Wernicke's area" and the VTA marker are our approximations, not Allen Institute delineations. No endorsement by the Allen Institute is implied.
> The atlas was drawn on the ICBM 2009b Nonlinear Symmetric template, Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University.

The last sentence is a courtesy. We never copy the template intensities, and the ICBM licence (<https://www.bic.mni.mcgill.ca/ServicesAtlases/ICBM152NLin2009>) is permissive anyway ("for any purpose … provided that the above copyright notice appear in all copies").

**Prototype stand-in (optional, same licence family).** The HRA "3D Reference Organ for Brain, Male v1.3" is the same Allen atlas, already meshed by the HuBMAP Human Reference Atlas team. It is CC BY 4.0 per its metadata at <https://cdn.humanatlas.io/digital-objects/ref-organ/brain-male/v1.3/> and on NIH 3D (3DPX-020960, <https://3d.nih.gov/entries/20960>). Front-end work can start on it while the pipeline is built.

Don't ship it as the final asset:
- **Rescaled:** it was "resized to fit the Visible Human Male and Female bodies".
- **Coarse small structures (measured):** substantia nigra has 118 triangles per side, hypothalamus 150, nucleus accumbens 472.
- **Large:** 11,977,312 bytes uncompressed.
- **Body-height offset:** it sits at the Visible Human body position, roughly y = 0.76–0.90 m.

If it is used even in a preview, credit "Kristen Browne; Heidi Schlehlein. 2023. *3D Reference Organ for Brain, Male v1.3*. https://doi.org/10.48539/HBM929.XKCL.339 (CC BY 4.0)" alongside the Allen credit.

### Runner-up: SPL/NAC Brain Atlas, January 2017 (Open Anatomy / 3D Slicer)

**Source.** <https://openanatomy.org/atlas-pages/atlas-spl-nac-brain.html>; download <https://www.openanatomy.org/atlases/nac/brain-2017-01.zip> (197,913,214 bytes). The archive's `LICENSE.md` reads: *"This atlas is released under the terms of the 3D Slicer License."* Licence text: <https://github.com/Slicer/Slicer/blob/main/License.txt> ("3D Slicer Contribution and Software License Agreement, Version 1.0 (December 20, 2005)"). The Open Anatomy page names "section B" of that licence.

**Why it is the runner-up.**
- **Provenance:** a real single subject (healthy 42-year-old male, 3T MRI, 0.75 mm), segmented by FreeSurfer and then corrected by hand by experts.
- **Coverage (measured):** 344 labels and 359 VTK models, including substantia nigra, nucleus accumbens, and the IFG opercular and triangular parts.
- **Gap:** no VTA.

**Licence decision: usable, but heavier than CC BY.**
- **Commercial use:** Part B ¶2 allows incorporation "into proprietary programs". ¶4 says "Any commercialization of the Software is at the sole risk of the party or parties engaged in such commercialization."
- **Notice burden:** each distributed copy must carry *all* of Part B, prefaced with "All or portions of this licensed product (such portions are the "Software") have been obtained under license from The Brigham and Women's Hospital, Inc. and are subject to the following terms and conditions:" (Part B ¶1(b)).
- **Other conditions:** modified versions must be "clearly identified and marked as such" (¶1(d)), and Brigham's name can't be used to endorse the product (¶6).
- **Ambiguity:** Brigham licenses only "Brigham's rights". Contributors include MGH and CMA, which presumably granted rights to Brigham under Part A, but this is not stated for the atlas.

**Attribution if used.** The Part B preface and full Part B text, plus:

> SPL/NAC Brain Atlas (2017-01), Surgical Planning Laboratory, Brigham and Women's Hospital: M. Halle, F. Talos, M. Jakab, N. Makris, D. Meier, L. Wald, B. Fischl, R. Kikinis. https://www.openanatomy.org/atlas-pages/atlas-spl-nac-brain.html. Modified by Study with Shabari (simplified, recoloured, grouped).

The formal citation page the README points to (spl.harvard.edu/publications/item/view/1265) could not be loaded (certificate error, then 404). **Not verified.**

---

## 2. Candidate comparison

"Commercial" means commercial use as a feature on a paid tutoring site. "SA consequence" explains what serving the files to browsers obliges.

| Candidate | Licence (exact, URL) | Commercial | Attribution | Share-alike / redistribution consequence | Modify | Provenance | Segmentation | Formats, size, polycount |
|---|---|---|---|---|---|---|---|---|
| **Allen HRA-3D 2020 v1.0.0** | CC BY 4.0 since 2022-09-01 (README.pdf, <https://creativecommons.org/licenses/by/4.0/>) | Yes | Allen citation on the same page; indicate changes | None. Can't add terms or DRM that restrict reuse of the Allen-derived material | Yes | Expert delineation on the MNI ICBM 2009b symmetric average (atlas-derived) | Voxel labels, 141 structures, hierarchy via Allen API (graph 16) | NIfTI 0.5 mm, 1.8 MB (full) / 1.1 MB (half); we mesh it. Outer surface 667,820 boundary voxels (measured) → roughly 1.3–1.6 M triangles before simplification (estimate) |
| HRA brain-male v1.3 (HuBMAP; NIH 3D 3DPX-020960) | CC BY 4.0 (metadata: "In version v1.3, an update in licensing occurred"); earlier versions' licence not stated | Yes | HRA citation + Allen | None | Yes | Allen HRA-3D meshed and mirrored, "resized to fit" Visible Human, exported from Maya | 283 named meshes (both hemispheres) | GLB 11,977,312 B; 656,268 tris; 324,855 verts; POSITION+NORMAL; no textures (measured). Units in metres at body height |
| BodyParts3D 4.0 (DBCLS) | **CC BY 4.0** per <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html> (updated 2025-02-27). **Conflict:** <https://lifesciencedb.jp/bp3d/info/license/index.html> and the 2013 OBJ headers still say CC BY-SA 2.1 JP | Yes under BY 4.0 | "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International" | None under BY 4.0; BY-SA if the old licence were held to apply | Yes | TARO voxel model from 2 mm MRI of one male volunteer, then hand-edited "using a 3D editing program" from textbooks, atlases and illustrators' mock-ups (NAR 2008, PMC2686534) | Separate OBJ per FMA element. Has lobes (as gyral compounds), PrCG, PoCG, whole IFG, posterior STG, hippocampus, amygdala, thalamus, hypothalamus, caudate, putamen, GP, CC, cerebellum, midbrain, pons, medulla. **No NAc, SN, VTA; no Broca subparts** | OBJ, mm, body coordinates. PART-OF zip 62 MB (1,258 OBJ); brain = 59 OBJ, 21.7 MB uncompressed; samples ~58–67 B/face → about 320–370 k tris (estimate) |
| Z-Anatomy | CC BY-SA 4.0 ("All the code and content shared by 'Z-Anatomy'", repo License.txt, <https://github.com/Z-Anatomy/Models-of-human-anatomy>) | Partly. Bundle includes **NC parts** (inner ear CC BY-NC-SA 4.0, kidney CC BY-NC 4.0) | Z-Anatomy + BodyParts3D (+ Brainder) | **SA attaches to every adapted mesh we serve**, and to renders of it (fallback image, OG image). It doesn't reach site code or captions, which are a "collection" per the CC FAQ. No DRM or terms restricting reuse | Yes (BY-SA) | BodyParts3D "modified, repaired, resized and colored", mixed with "Brainder" and "White matter from the University of Washington" (licence unstated) | Per-object in a .blend; brain-object provenance per object not documented | Blender template zip 86.7 MB; Sketchfab "Neurology" preview 3,261,100 faces. Brain-only polycount not verified |
| NIH 3D (other brain entries) | Per entry; site terms: "Users are responsible for selecting and applying the appropriate license" (<https://3d.nih.gov/terms>) | Depends | Per entry | Per entry | Per entry | Varies | 3DPX-021161 "Detailed Human Brain Model" CC BY 4.0, provenance unclear, no listed segmentation. 3DPX-003892 brainstem (BodyParts3D-derived) **CC BY-NC-SA 4.0**. 3DPX-000757 left hemisphere CC0, single MRI scan, no parts | Not inspected beyond entry pages |
| SPL/NAC Brain Atlas 2017-01 | 3D Slicer Licence v1.0 (2005), Part B | Yes ("proprietary programs"; "sole risk") | Full Part B text with prescribed preface; preserve notices | No SA, but the full licence text must ship with copies and documentation | Yes, marked as modified | One healthy 42-year-old male, 3T MRI, FreeSurfer + manual | 344 labels; 359 VTK models incl. SN, NAc, IFG op/tri; no VTA | Zip 198 MB; VTK 61 MB uncompressed; about 3 M tris total (estimate from the hippocampus sample: 2,962 points) |
| FreeSurfer fsaverage | FreeSurfer Software License Agreement v1.0 (Feb 2011), Part B (<https://surfer.nmr.mgh.harvard.edu/fswiki/FreeSurferSoftwareLicense>) | Yes "at the sole risk" | Full Part B text with MGH preface | No SA; heavy notice | Yes, marked | Average surface template shipped with FreeSurfer (subject count not re-verified) | Cortex surfaces with per-vertex DK/Destrieux labels; subcortical only as a volume (aseg); no SN, VTA or hypothalamus | ~163,842 vertices per hemisphere (standard ico7, not re-verified). Getting it requires a FreeSurfer download and licence-key registration, which I did not do. Whether fsaverage counts as licensed "data" under Part B is ambiguous |
| HCP-derived meshes | WU-Minn HCP Open Access Data Use Terms (<https://www.humanconnectome.org/study/hcp-young-adult/document/wu-minn-hcp-consortium-open-access-data-use-terms>) | Not addressed | Required acknowledgement text (Term 5) | **Derived data may be redistributed only "under these same Data Use Terms"** (Term 4). Anonymous browsers can't be bound to them | — | Real subjects (MRI) | Varies | **Reject.** Requires a ConnectomeDB account and acceptance |
| BrainGlobe `allen_human_500um` v1.0 | Code BSD-3. The atlas is a repackaging of Allen HRA-3D + ICBM template; the generator script sets no licence field | Follows upstream (CC BY 4.0) | Allen + BrainGlobe | As upstream | Yes | Same Allen labels; meshes made with decimate 0.2, no smoothing | Mesh per ontology node (L+R merged; labels aren't lateralised) | Tarball 70,001,893 B; its `metadata.json` was not inspected |
| Scalable Brain Atlas | No blanket licence: "The license terms of the original data source apply" + citation policy (<https://scalablebrainatlas.incf.org/main/citationpolicy.php>) | Per atlas | Per atlas + SBA paper | Per atlas | Per atlas | Aggregator | e.g. NMM1103 | **NMM1103 (Neuromorphometrics) EULA: "only for evaluation purposes … nor create derivative works, nor use … for commercial purposes"** → reject. Other SBA human atlases not checked |
| Sketchfab CC models | Uploader-chosen CC licence; downloads need an account (<https://sketchfab.com/developers/download-api/guidelines>) | Only BY / BY-SA / CC0 | Creator + link | BY-SA models: SA as for Z-Anatomy | Per licence | Almost all hand-modelled or scans of physical models: Science Museum 19th-c. papier-mâché model (CC0, 743,676 faces); RISD Artec scan (CC BY, 750k); student ZBrush model (CC BY, 45k); "Lobes of the Cerebrum" (CC BY, adaptation of an artist model) | Lobes at best; no faithful nuclei | Uploader's right to license can't be verified. **Not anatomically faithful** |
| *Found:* Brainder "Brain for Blender" | CC BY-SA 3.0 Unported (<https://brainder.org/brain-for-blender>) | Yes | Link to page | SA (adaptable under 4.0) | Yes | One subject, 12 averaged MPRAGE at 0.8 mm, FreeSurfer 5.2.0 | Per-region files: DK, Destrieux, DKT cortex + aseg subcortical; no SN, VTA or hypothalamus | OBJ/PLY/SRF/MZ3; sizes not stated |
| *Found:* CIT168 subcortical atlas | OSF node licence "CC-By Attribution 4.0 International" (2017), but built from HCP S500 data | **Ambiguous** (HCP Term 4) | — | — | — | 168 HCP subjects, probabilistic | **Includes VTA**, SNc/SNr, NAc, HTH | Volumes; not downloaded |
| *Found:* Julich-Brain (EBRAINS) | CC BY-NC-SA 4.0 per the SciCrunch RRID record (secondary; EBRAINS page not checked) | No (NC) | — | — | — | Cytoarchitectonic, post-mortem | Areas 44/45, 4a/4p, 3a/3b/1/2 (would be the gold standard for Broca, M1, S1) | Reject unless a commercial licence is negotiated |

**Answering the BY-SA question directly.** Under CC BY-SA 4.0, ShareAlike attaches to *Adapted Material* (§1(a), §3(b)).
- **Covered:** our decimated, split and recoloured meshes. Renders of them (static fallback images, SVG outlines traced from them, social images) are very likely adaptations too, and at least reproductions that need the notice.
- **Not covered:** the CC FAQ says *"CC licenses do not require the collection or the compilation itself to be made available under an SA license."* So the Next.js code, the R3F viewer and original captions stay ours.
- **Obligations:** we must offer the derived mesh files themselves under BY-SA 4.0 (§3(b)(1)). We can't apply "Effective Technological Measures" or terms that restrict reuse of those files (§3(b)(3)). The site's terms must carve them out, and competitors may legally reuse the processed meshes.
- **Caption trap:** if captions were copied from Z-Anatomy's Wikipedia-based definitions (CC BY-SA 3.0), they would be adaptations too. Don't use them.
- **CC BY 4.0 (recommended asset):** it has the same "no downstream restrictions" rule (§2(a)(5)(B)) but no SA.
- **Repo action either way:** `src/app/(site)/terms/page.tsx` currently says "Notes and practice questions … Please don't republish, sell or bulk-copy them." That is scoped to notes and questions, which is fine. Add one sentence: "Third-party material, including the 3D brain model, is under its own licence (see Credits); these terms don't limit your rights under those licences."

**Could not verify:**
- Z-Anatomy brain polycount, and which Z-Anatomy brain objects come from Brainder vs BodyParts3D.
- Contents of the BrainGlobe tarball `metadata.json`.
- Sketchfab archive contents (login required).
- fsaverage subject count and whether its data counts as licensed "Software".
- The SPL citation page.
- Julich-Brain's licence at EBRAINS.
- The CIT168 vs HCP conflict.
- The licence of HRA brain versions before v1.3.

---

## 3. Asset pipeline

### 3.1 Principle

The atlas label volume is the single source of truth.
- **Scripted, no hand-sculpting:** every step is a script checked into `scripts/brain/`, so meshes can be regenerated byte-for-byte.
- **Blender for inspection only:** it is used for visual QA, never to edit geometry. If a manual fix ever becomes unavoidable, it goes in a `CHANGES.md` with before/after renders and Shabari's sign-off.

### 3.2 Steps

Python 3.12 venv, local only, never in the Vercel build. Libraries: `nibabel`, `numpy`, `scipy`, `vtk>=9.3` (for `vtkSurfaceNets3D`) and `trimesh`. Then `gltfpack` (meshoptimizer CLI) or `@gltf-transform/cli`, pinned.

1. **Fetch and checksum.** `fetch_allen.py` downloads `annotation_full.nii.gz`, `annotation.nii.gz`, `voxel_count.csv` and README.pdf. It records SHA-256 values in `scripts/brain/SOURCES.lock`. Source files are not committed (they are 1.8 MB, but this keeps licensing simple); the lockfile pins them.
2. **Clean.** Drop connected components under 1,000 voxels (removes the 4 stray voxels). Assert 141 labels remain.
3. **Hemisphere split.** Voxels with x < 0 mm are left; x ≥ 0 mm (index ≥ 196) are right. Write the rule into the manifest.
4. **Reassign unpartitioned white matter.**
   - HWM goes to the nearest of {cerebellum, pons, medulla, midbrain} by Euclidean distance transform. This was tested: 98.2% goes to cerebellum, and the 95th-percentile distance is 4.2 mm.
   - FWM faces exposed on the outer surface (0.85% of the surface, measured) go to the nearest cortical label.
5. **Define "atoms".** An atom is the finest partition the UI needs, per hemisphere: for example `L.PrCG`, `L.IFGop`, `L.IFGtr`, `L.PFC_rest`, `L.STG_post`, `L.STG_ant`, `L.PLT`, … `L.HiF`, `L.AMY`, `L.THAL`, `L.HTH`, `L.CAUD`, `L.PUT`, `L.GP`, `L.NAC`, `L.SN`, `MID`, `PONS`, `MED`, `CC`, `L.CB`, …
   - **Display regions** (frontal lobe, motor cortex, Broca's area, striatum, …) are *sets of atoms* in `regions.json`. Overlapping concepts (PrCG is both "frontal lobe" and "motor cortex") never produce overlapping geometry.
   - **The STG split rule** for the Wernicke approximation is the coronal plane at the anterior-most voxel of TTG. It is applied to label data before meshing and reported in the manifest.
6. **Surface extraction.**
   - **Cortex shell:** one multi-label surface per hemisphere using `vtkSurfaceNets3D`, which produces shared, crack-free boundaries between labels and has constrained smoothing that keeps vertices inside their voxel. Keep only faces between brain and background, which gives the visible pial-like shell. The midline cut becomes the medial wall.
   - **Deep structures:** closed surfaces per atom (hippocampus, amygdala, thalamus, hypothalamus, caudate, putamen, GP, NAc, SN, CC, brainstem parts).
   - **Smoothing:** use the constrained mode, not plain Laplacian smoothing, which shrinks structures.
7. **Simplify with an error bound.** Simplify per atom with locked borders, so atom boundaries stay shared and gap-free. Record the symmetric Hausdorff distance against the unsimplified surface. **The build fails if it exceeds 1.0 mm (mobile tier) or 0.5 mm (desktop tier, one voxel).** This turns "anatomically faithful" into a measurable gate.
8. **Region outlines.** Extract the shared edges between atoms whose display-region membership differs, chain them into polylines and simplify them (≤0.25 mm). Store them as `LineSegments` geometry per display region. These are the exact atlas borders, used for 3D outlines and for the SVG fallback.
9. **Orientation and scale.** Convert MNI RAS mm to glTF metres with a pure axis permutation: glTF **X = −R (subject's left = +X), Y = S, Z = A**, scaled by 0.001.
   - This is right-handed, and the face looks down +Z, as glTF expects ("front faces +Z").
   - Keep the MNI origin (≈ anterior commissure) as the glTF origin, so any point can be traced back to MNI coordinates.
   - Store the bounding-box centre in the manifest as the default camera target.
10. **Per-region metadata.** For each display region, compute:
    - bounding sphere;
    - preferred view direction (one of the presets, or the direction that maximises the visible projected area);
    - label anchor: the surface point nearest that view;
    - Allen structure IDs and acronyms;
    - hemisphere set;
    - an `approximate: true` flag plus a rule description where it applies.
11. **glTF assembly.** One node and mesh per atom, named by atom ID, with `extras` = {allenIds, regionIds}. Positions and normals only, no UVs. `asset.copyright` holds the short attribution string; `asset.extras.license` = CC BY 4.0 URL; `asset.extras.source` = Allen URL plus SHA-256.
12. **Compress per tier with gltfpack** `-cc -kn -km -ke` (keep named nodes and materials and extras so atoms aren't merged). Use the default **EXT_meshopt_compression**.
    - Don't use `-cz` or `-ce khr`: three r182's GLTFLoader supports only `EXT_meshopt_compression` (checked in GLTFLoader.js r182).
    - Per the meshoptimizer v1.0 notes, `EXT_meshopt_compression` "only supports v0" vertex encoding. That matters because three r182's bundled decoder is "Built from meshoptimizer 0.22".
    - Pin the gltfpack version, and add a Node test that parses every output with three's `GLTFLoader` + `MeshoptDecoder`.
13. **Measure and report.** `report.json` lists triangles per atom, bytes per tier (raw, gzip, brotli), Hausdorff per atom, and draw calls. CI fails on budget overruns (§3.4).
14. **Static fallback art.** Reuse the repo's poster approach (`scripts/render-posters.mjs` renders posters from the live molecule scene).
    - Render the real R3F scene headlessly for 3 views: left lateral, right medial (hemisphere split, showing CC, thalamus and brainstem in section), and a deep "glass" view.
    - Render a second **ID buffer** pass: flat atom colours, no lighting, no anti-aliasing.
    - Trace the ID buffer with `skimage.measure.find_contours` + Douglas–Peucker (≤0.75 px), giving one SVG `<path id="region-…">` per display region per view.
    - The SVG therefore shares geometry and IDs with the 3D. Output AVIF/WebP posters plus SVG overlays.

### 3.3 Compression and decoder choice in three@0.182

| Option | Decoder | Decoder cost | Notes |
|---|---|---|---|
| **EXT_meshopt_compression + KHR_mesh_quantization (recommended)** | `import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js"` → `loader.setMeshoptDecoder(MeshoptDecoder)` | 24,848 B raw / ~6.5 KB gzip, WASM embedded | Needs **CSP `'wasm-unsafe-eval'`** (it calls `WebAssembly.instantiate`). Don't call `useWorkers()`: it creates blob: workers that the CSP doesn't allow |
| KHR_mesh_quantization only + gzip | none | 0 | No WASM and no CSP change. Roughly 2× larger than meshopt+gzip (estimate). Fine for the mobile tier, heavy for desktop |
| Draco | `DRACOLoader` + self-hosted `/draco/gltf/` | 192,420 B WASM + 58,456 B wrapper | Also needs `'wasm-unsafe-eval'`; bigger decoder and slower decode; no benefit here |

No drei is needed. Use `GLTFLoader` from `three/examples/jsm/loaders/GLTFLoader.js` with R3F's `useLoader(GLTFLoader, url, (l) => l.setMeshoptDecoder(MeshoptDecoder))`.

**Two deployment facts that change the numbers:**
- **CSP.** `src/lib/csp.ts` sets production `script-src 'self' 'unsafe-inline'` (eval only in dev). Meshopt or Draco require adding `'wasm-unsafe-eval'` to `script-src` in that file and updating `e2e/csp.spec.ts`. If that change isn't approved, use the quantization-only path.
- **Vercel won't gzip GLB.** Its documented compression allowlist (<https://vercel.com/docs/compression>) has no `model/gltf-binary` or `application/octet-stream`. Meshopt output is designed to be post-compressed. So the pipeline also writes `*.glb.gz`. The client fetches it, pipes it through the native `DecompressionStream('gzip')` and calls `GLTFLoader.parseAsync(arrayBuffer)`. If `DecompressionStream` is missing, it falls back to the plain `.glb`. Don't fake a `Content-Encoding` header.

### 3.4 Per-device budgets

Byte figures are estimates (meshopt+gzip ≈ 3–5 B/triangle). Phase 1 replaces them with measured numbers in `report.json`.

| Tier | When | Triangles (loaded) | Mesh bytes transferred | Draw calls | Max Hausdorff |
|---|---|---|---|---|---|
| **Mobile (default)** | `(pointer: coarse)` or width < 768 or `deviceMemory ≤ 4` or `saveData` | **≤ 150 k** (cortex shell ~90 k; cerebellum 14 k; brainstem 9 k; CC 3 k; each deep nucleus ≥ 600–2,500 so small structures keep their shape) | **target ≤ 0.9 MB, hard cap 1.5 MB** | ≤ 80 | 1.0 mm |
| **Desktop high** | fine pointer, width ≥ 1024, not `saveData`; fetched on idle *after* the mobile tier renders, then swapped | ≤ 700 k | ≤ 3.5 MB | ≤ 120 | 0.5 mm |

Plus:
- **3D JS chunk:** ≤ 220 KB gzip (three + R3F + GLTFLoader + OrbitControls + MeshoptDecoder). three and R3F are probably already cached from the molecule scene's chunk.
- **Fallback poster:** ≤ 60 KB AVIF on mobile and ≤ 120 KB on desktop. It is the LCP element.

### 3.5 Materials

No textures.
- **Base material:** `MeshStandardMaterial` (roughness ≈ 0.7, metalness 0), one per display category, cloned for state.
- **Lighting:** reuse the repo's locally generated `RoomEnvironment` PMREM (no HDR download).
- **Optional sulcal shading:** bake mean curvature into a 1-byte vertex attribute and darken sulci in `onBeforeCompile`. The average-template brain is smooth, and this helps depth perception without extra geometry. Desktop tier first; mobile only if it fits the budget.
- **Palette:** a colour-blind-safe categorical palette per layer. Selection is never colour alone: it also gets an outline, a label and list state. Selected outlines need ≥ 3:1 contrast against the background (WCAG 1.4.11), with tokens for light and dark themes.

### 3.6 Where files live, caching, and notices

- **Files:**
  - `public/models/brain/v1/brain-mobile.<sha8>.glb(.gz)`
  - `public/models/brain/v1/brain-desktop.<sha8>.glb(.gz)`
  - `public/models/brain/v1/ATTRIBUTION.txt`
  - a `LICENSE` link file
- **Manifest:** `src/content/brain/regions.json` holds IDs, atoms, views, anchors and hashes. It is imported into the client chunk, so it deploys atomically with the code and needs no extra request.
- **Caching:** add `headers()` in `next.config.ts` for `/models/brain/:path*`: `Cache-Control: public, max-age=31536000, immutable`. Filenames are content-hashed, so a new pipeline run produces new URLs.
- **Notices:**
  - the short credit line directly under the viewer and under the fallback (same page, per the Allen policy);
  - the full credit on `/credits` (new) or a "Credits" section in `/terms`;
  - inside each glTF (`asset.copyright`);
  - in `ATTRIBUTION.txt`;
  - in a repo `THIRD_PARTY_NOTICES.md`;
  - plus the terms carve-out sentence from §2.

---

## 4. R3F implementation plan

### 4.1 Page, loading and state

**Route.** For example `/mcat/brain`. The page is a Server Component that renders:
1. a fixed `aspect-ratio` stage box with the poster `<img>` (explicit width and height) and the SVG overlay;
2. the grouped region list;
3. the details panel showing **published** captions only.

**Links work without JavaScript.** Region list items are links (`?region=hippocampus`), so the server can render the selected state (highlighted SVG plus caption).

**Client wrapper** (`'use client'`):
- Follows `src/components/cinema/molecule-stage.tsx`: `next/dynamic(() => import("./brain-scene"), { ssr: false })`.
- Starts only after first paint: on `requestIdleCallback`, or when an `IntersectionObserver` sees the stage, or on a first user intent such as hover or focus on the stage or a press of "Explore in 3D".
- Loads nothing if WebGL is missing.

**Capability hook.** Add a separate `useExplorerMode()` and don't reuse `useStageMode()`. The existing hook returns `"static"` under reduced motion. For this explorer, reduced motion means *no animation*, not *no 3D*. The new hook returns `{ webgl, reducedMotion, tier }`.

**State.** One small external store (`useSyncExternalStore`, no new dependency) holding `{ selected, preview, hovered, layer: "lobes"|"areas"|"deep", view, xray }`, synced to `?region=` with `history.replaceState`. The DOM list, the SVG fallback and the R3F scene all read and write it (R3F v9 forwards context into `<Canvas>`).

**Canvas.**
- `<Canvas frameloop="demand" dpr={[1, tierCap]} gl={{ antialias: true, powerPreference: "high-performance" }}>`, with `tierCap` = 1.5 on mobile and 2 on desktop.
- Call `invalidate()` on control changes and during animations only, which saves battery.
- Swap poster → canvas only after the first rendered frame, as a crossfade in the same box, so there is no layout shift.

### 4.2 Scene structure

```
<Canvas>
  <Studio/>                         // RoomEnvironment PMREM (existing pattern)
  <Lights/>
  <BrainRoot>                       // group in metres, MNI origin
    <CortexShell hemi="L|R">        // atom meshes, opaque; x-ray: opacity 0.15, depthWrite false, renderOrder after deep
    <DeepStructures>                // closed atom meshes, opaque
    <RegionOutlines>                // LineSegments per display region, visible for selected/preview
    <VtaMarker>                     // anchored sprite + ring inside MTg, flagged approximate
    <PickProxies layer={1}>         // mobile-tier geometry, never rendered; desktop picks against these
  </BrainRoot>
  <CameraRig/>                      // OrbitControls from three/examples/jsm, damping off when reduced motion
  <LabelProjector/>                 // writes screen positions to the DOM overlay
</Canvas>
```

**Controls.** `OrbitControls` is created in an effect with `new OrbitControls(camera, gl.domElement)` and disposed on cleanup.
- Pan is disabled on touch.
- Distance and polar angle are clamped.
- `touch-action: none` applies only to the canvas.

**Mobile scrolling.** The canvas would otherwise trap one-finger page scrolling on mobile. Mitigations:
- Keep the stage at ≤ 60svh, with the region list below it.
- On coarse pointers, show an "Explore in 3D" button that activates the controls.

### 4.3 Picking, hover and focus

**Picking.**
- R3F pointer events on atom meshes. The handler maps atom → display region through `regions.json` *for the active layer*:
  - in "lobes", PrCG resolves to the frontal lobe;
  - in "areas", it resolves to motor cortex.
- Atoms not in the active layer get `raycast={() => null}`.
- In the "deep" layer the shell goes x-ray and stops intercepting rays.

**Picking cost.** On the desktop tier, raycast only against low-poly proxies on `Layers` channel 1, which the render camera excludes. That keeps picking cheap without adding `three-mesh-bvh`. Hover is enabled only under `(hover: hover) and (pointer: fine)` and is rAF-throttled.

**Visual states:**

| State | Trigger | Visual | Camera |
|---|---|---|---|
| hovered | pointer over (desktop) | emissive tint + outline | none |
| preview | keyboard focus on a list item | same as hovered + label | none |
| selected | click, tap, Enter or Space | high-contrast fill + outline + label; other regions dimmed (x-ray for deep) | fly-to |

**Keys.** Esc clears the selection and returns to the overview.

### 4.4 Camera fly-to

- Each region has a stored `{target, direction, distance}` from the pipeline (§3.2 step 10).
- `CameraRig` animates in `useFrame`:
  - the target is lerped with `MathUtils.damp`;
  - the direction is slerped on the unit sphere (quaternion between direction vectors);
  - the distance is damped;
  - the move takes about 700 ms with ease-out, and calls `invalidate()` while moving.
- Any user drag cancels the move.
- Six presets: left lateral, right lateral, medial, superior, inferior, anterior.
- **Reduced motion:** the camera jumps instantly. There is no damping inertia, no auto-rotate and no pulsing highlight.
- motion@14 isn't needed here. The `useFrame` approach matches the existing `Rig` in `molecule-scene.tsx`.

### 4.5 Labels

Labels are a DOM overlay; drei's `<Html>` isn't needed.
- **Positioning:** `LabelProjector` projects each visible label's anchor with `Vector3.project(camera)` whenever the camera changes, and writes CSS `transform` values to absolutely positioned elements.
- **Occlusion:** one raycast toward the anchor when the camera settles (not every frame). Hidden anchors get "behind" styling or are hidden.
- **Count:** at most 3 labels at once (selected, preview or hover, plus lobe names in the overview at rest).
- **Placement:** an SVG leader line connects label and anchor, and labels are clamped inside the stage.
- **Mobile:** floating labels are replaced by a bottom sheet with the selected name.
- **Accessibility:** overlay labels are `aria-hidden`, because the region list carries the accessible names.

### 4.6 Keyboard and screen-reader equivalents

Every pointer action has a non-pointer equivalent (WCAG 2.1.1, 2.5.7):

| Pointer action | Equivalent |
|---|---|
| Click or tap a region | Region list: grouped `<button aria-pressed>` items (headings: Lobes / Cortical areas / Deep structures / Brainstem & cerebellum); Enter or Space selects. Optional roving arrow-key navigation within a group |
| Hover | Focus on a list item (preview) |
| Drag to rotate | Arrow keys on the focused stage (15° steps) + on-screen rotate buttons |
| Pinch or wheel zoom | `+` / `-` keys + zoom buttons |
| Reset | `0` / Home + "Reset view" button |
| Views | Preset buttons (Lateral L/R, Medial, Superior, Inferior, Anterior) |
| X-ray / layer | Toggle buttons with `aria-pressed` |

**Screen-reader wiring.**
- The stage wrapper has `role="group"`, an `aria-label` describing the current view and selection, and `aria-describedby` pointing to short instructions.
- An `aria-live="polite"` status says, for example, "Hippocampus selected, both hemispheres. Approximate region" when it applies.
- The details panel is a labelled `<section>`.
- **Focus stays in the list.** Selection never moves it, and the camera move is purely visual.

### 4.7 Reduced motion

- **Detection:** `prefers-reduced-motion: reduce`.
- **Behaviour:** instant camera cuts, no damping, no idle spin, and crossfades ≤ 120 ms or none.
- **What stays:** 3D stays fully available, and the user can still rotate manually.

### 4.8 WebGL-off fallback

The SSR poster + SVG overlay *is* the first paint, so there is nothing extra to load.
- **When it stays:** WebGL isn't available (tested by `getContext("webgl2") ?? getContext("webgl")`), or the context is lost (`webglcontextlost`, with `preventDefault`, plus a "Try 3D again" button).
- **Behaviour:** the region list drives SVG highlighting through CSS classes on `path#region-<id>`. It switches to whichever of the three views shows the region; deep structures use the medial or glass view.
- **Same state and captions:** the fallback uses the same list, state and captions as the 3D, and works with no JS at all through the `?region=` links.

### 4.9 Disposal, adaptive DPR and quality

**Disposal on unmount.**
- Traverse loaded scenes and dispose geometries and materials, including the cloned state materials.
- Call `useLoader.clear(GLTFLoader, url)`, `controls.dispose()` and the PMREM/env dispose (as `Studio` already does).
- Remove DOM listeners.
- Check whether R3F's Canvas unmount releases the context. If it doesn't, call `gl.dispose()` and `gl.forceContextLoss()` explicitly.

**Adaptive DPR.**
- Keep an exponential moving average of frame time during interaction.
- If it stays above 20 ms for 30 frames, lower DPR by 0.25, down to 1.0.
- If it stays below 12 ms for 120 frames, raise DPR back up to the tier cap.
- This can use R3F's `performance` / `setDpr` hooks; no drei `PerformanceMonitor` is needed.

**Tier choice.** Load the mobile tier first, always, and upgrade to the desktop tier on idle only on capable devices that aren't on `saveData`.

### 4.10 Testing (Playwright 1.64 + @axe-core/playwright 4.14, already in devDependencies)

Add `e2e/brain-explorer.spec.ts`, plus cases in `a11y.spec.ts`, `performance.spec.ts`, `mobile.spec.ts` and `csp.spec.ts`. A test-only `window.__brain` hook, compiled out of production, exposes camera state, a project-to-screen helper and `renderer.info.memory`.

1. **WebGL off.** Use `addInitScript` to override `HTMLCanvasElement.prototype.getContext` so it returns `null` for `webgl*`. Assert that:
   - the poster and SVG are visible and no `<canvas>` exists;
   - **no `.glb` request is made**;
   - list selection highlights the right `path#region-…` and updates the caption;
   - the console has no errors.
2. **Reduced motion.** `test.use({ reducedMotion: "reduce" })`. After a selection, the camera state is `settled` within one frame, and no rAF loop keeps running afterwards (frame counter flat).
3. **Mobile 390×844.** `viewport {390, 844}`, `deviceScaleFactor: 3`, `isMobile`, `hasTouch`. Check that:
   - the mobile tier is loaded, and the sum of `.glb` response sizes is **≤ 1.5 MB**;
   - there is no horizontal scroll;
   - tapping a projected anchor selects the region;
   - the page still scrolls outside the stage.
4. **axe.** `AxeBuilder` with WCAG 2.2 AA tags on the fallback state *and* after the 3D swap, with 0 violations.
5. **No layout shift.** A `PerformanceObserver('layout-shift')` is injected before load. Cumulative CLS must be < 0.01 through the poster→canvas swap, and the stage bounding box must be identical before and after.
6. **Keyboard.** Tab into the list, Enter selects, the live region text updates, arrow keys on the stage change the camera, Esc resets, and the focus order is sane.
7. **Disposal.** Navigate away and back 3×. Geometry and texture counts return to baseline, and there is no "too many active WebGL contexts" warning.
8. **CSP.** Zero `securitypolicyviolation` events on the page (this catches a missing `'wasm-unsafe-eval'`).
9. **No draft leak.** Seed a REVIEW caption, then search the HTML, RSC payload and JS/JSON responses of the public page for its text. It must be absent.
10. **Asset decode.** A Node test runs `GLTFLoader.parseAsync` + `MeshoptDecoder` on each tier and checks atom count = manifest count and triangles within budget.

Headless Chromium renders WebGL with SwiftShader, so CI checks function, bytes and triangle counts, not frame rate. Frame rate is checked by hand on a recent iPhone and a mid-range Android before launch.

### 4.11 Performance budgets

| Metric | Budget |
|---|---|
| LCP (poster) | ≤ 2.5 s on mobile 4G; poster ≤ 60 KB |
| CLS | < 0.01 (target 0) |
| INP for region selection | ≤ 200 ms (DOM state updates synchronously; the camera move is async) |
| Mesh transfer | mobile ≤ 0.9 MB target / 1.5 MB cap; desktop ≤ 3.5 MB |
| 3D JS chunk | ≤ 220 KB gzip |
| Time from intent to first 3D frame | ≤ 2.5 s on Fast 4G, mid Android |
| Main-thread long tasks during load | none > 100 ms; parse+decode split per tier |
| Frame rate while rotating | 60 fps on a recent iPhone; ≥ 30 fps floor on mid Android with adaptive DPR |
| GPU memory | ≤ 60 MB (mobile) |
| Idle CPU | 0 (frameloop demand) |

---

## 5. Content workflow (captions)

The repo already has `ContentStatus { DRAFT, REVIEW, PUBLISHED, ARCHIVED }`, `Authorship { HUMAN, AI }`, versioned `Lesson` with `publishedVersionId`, and `Topic { slug, name, section }`. Reuse that pattern.

**1. Model.** Add `BrainRegionCaption`:
- `regionId` (manifest slug)
- `status ContentStatus @default(DRAFT)`
- `authoredBy Authorship`
- `publishedVersionId`
- versions holding `{ body, sources[], approximateNote?, reviewerId, reviewedAt }`
- many-to-many `topics` to `Topic`

Migrations go only through `scripts/migrate-supabase.sh`, per the runbook.

**2. Drafting.** One draft per display region (about 25). Each is marked REVIEW and records:
- its sources: the Allen ontology name and ID, and a textbook or review reference;
- whether it is AI- or human-drafted.

The engineer doesn't write educational text. Drafts come from Shabari, or from a drafting tool explicitly marked `authoredBy: AI`.

**3. What Shabari reviews:**
- the caption text;
- the **region manifest itself**: names, which atlas structures make up each display region, and the "approximate" rules for prefrontal cortex, motor and sensory cortex as gyral proxies, Wernicke's area, and the VTA marker;
- the laterality choice (Broca and Wernicke shown on the left only?).

Groupings are anatomy claims too, so they go through the same gate.

**4. Gating.**
- The public page reads only `publishedVersion`. A region without a published caption shows its name and the "approximate" badge, and no text.
- The whole route is behind a flag, off by default and admin-preview only, until Shabari approves the manifest and a launch set of captions.
- Approval triggers `updateTag("brain-captions")` (Cache Components) so the page refreshes.
- The no-draft-leak test (§4.10 #9) guards this.

**5. MCAT tie-in.** These mappings are proposed, need Shabari's confirmation, and should be checked against the AAMC outline (<https://students-residents.aamc.org/prepare-mcat-exam/whats-mcat-exam-pdf-outline>):

| Region(s) | Proposed AAMC categories |
|---|---|
| Lobes, motor and sensory cortex, corpus callosum (lateralisation, split brain) | PS 7A (biological bases of behaviour: forebrain, lateralisation), BB 3A |
| Broca's, Wernicke's | PS 6B (language; verify that language sits in 6B), PS 7A |
| Occipital lobe, thalamus, Heschl's gyrus | PS 6A (sensory processing) |
| Hippocampus | PS 6B (memory) |
| Amygdala, hypothalamus | PS 6C (emotion, stress); hypothalamus also BB 3A (endocrine control) |
| Basal ganglia, substantia nigra | BB 3A, PS 7A (movement; Parkinson's) |
| VTA, nucleus accumbens | PS 6B (reward pathway, drug addiction; verify), PS 7A |
| Cerebellum, brainstem | PS 7A (hindbrain), BB 3A |

Each region links to:
- its `Topic` rows;
- practice questions tagged with those topics (`QuestionTopic`);
- for VTA, SN, NAc and the striatum, the existing `/dopamine` lesson (mesolimbic and nigrostriatal pathways), once its content is published.

---

## 6. Risks, open questions and effort

### Risks (highest first)

1. **Composite regions aren't atlas regions.** PFC, motor and sensory cortex (gyral proxies), Wernicke's area (rule-based STG split) and the VTA (marker only) are approximations. *Mitigation:* `approximate` flag in data and UI, rules written into the manifest and credits, and Shabari's explicit sign-off.
2. **CSP blocks the decoder.** Production `script-src` lacks `'wasm-unsafe-eval'`, so meshopt or Draco fail silently in production. *Mitigation:* change `src/lib/csp.ts` (and its spec) with approval, or ship the no-WASM quantized+gzip path. A CSP-violation test catches it either way.
3. **Vercel doesn't compress GLB.** *Mitigation:* `.glb.gz` + `DecompressionStream`. Measure in Phase 1 before committing to budgets.
4. **Average-brain look.** An MNI template average has softer gyri than a single brain, and Allen staff note "averaging artifacts". *Mitigation:* curvature shading. The caption can say it is an average adult brain.
5. **Source-data quirks.**
   - Stray voxels: handled.
   - Medulla likely truncated at the volume edge: check visually and caption if needed.
   - Mirrored hemispheres: true symmetry, so no anatomical asymmetry.
   - Unpartitioned hindbrain white matter: nearest-label rule, tested.
6. **VTA has no clean commercial source.** CIT168 has a VTA label and an OSF CC BY 4.0 tag, but it derives from HCP data, whose terms bind derived data. Julich-Brain is NC. *Mitigation:* marker approach; ask the CIT168 authors or HCP in writing if a true VTA mesh is wanted.
7. **Mobile ergonomics and memory.** Scroll trapping, iOS WebGL memory limits, and two WebGL contexts if the molecule hero shares a page. *Mitigation:* stage height cap, explicit activation on touch, disposal tests, no shared page with the molecule hero.
8. **meshopt version drift.** gltfpack ≥ 1.0 defaults to v1 vertex encoding for non-glTF use. *Mitigation:* stay on `EXT_meshopt_compression` (v0), pin the gltfpack version, and keep the decode test.
9. **Licence drift.** Allen could re-license, or the HRA metadata could change. *Mitigation:* `SOURCES.lock` keeps SHA-256 values and archived licence pages; licences can't be revoked for copies already received under CC BY.
10. **Caption leakage.** *Mitigation:* server-only reads of published versions, plus the leak test.

### Open questions (for Nishanth and Shabari)

- Approve adding `'wasm-unsafe-eval'` to the production CSP? (This decides between meshopt and the no-WASM path.)
- Show Broca's and Wernicke's areas on the left hemisphere only, with lateralisation in the caption?
- Is a VTA *marker* (not a segmented volume) acceptable, and what wording should flag it?
- Which "four lobes" convention: show insula and limbic lobe as separate, as the Allen ontology does, or fold them in? (Recommendation: keep them separate.)
- Public page or logged-in feature? Which URL?
- Send the optional confirmation email to the Allen Institute?
- Is a desktop high-detail tier worth the extra 2–3 MB, or is the mobile tier enough everywhere?

### Effort (engineer-days, one engineer familiar with the repo)

| Phase | Work | Days |
|---|---|---|
| 0 | Decisions above, licence file set-up, Shabari kickoff on the region list | 0.5–1 |
| 1 | Asset pipeline: fetch/lock, clean, split, atoms, surface nets, error-bounded simplification, outlines, glTF assembly, gltfpack tiers, report, decode test | 4–6 |
| 2 | Explorer core: route, lazy load, capability hook, loader (gz + meshopt), scene, materials, picking with proxies, store + URL sync, region list | 4–5 |
| 3 | Camera rig and presets, labels and occlusion, x-ray, reduced motion, adaptive DPR, tier upgrade, disposal | 3–4 |
| 4 | Fallback: poster + ID-buffer SVG tracing, no-JS links, context-loss handling; credits page, terms carve-out, CSP change | 2–3 |
| 5 | Playwright and axe suite (§4.10), CI budget gates, real-device performance pass | 2–3 |
| 6 | Caption model + migration, admin review reuse, publish gating + cache tags, topic mapping | 2–3 |
| 7 | Anatomy QA with Shabari (region-by-region visual check against the atlas), fixes, launch | 1.5–2 |
| | **Total** | **≈ 19–27** |

Shabari's review time is not included (roughly 2–4 hours for about 25 captions plus the manifest). The HRA GLB stand-in lets Phases 2–3 overlap Phase 1, which shortens the calendar time by about a week.

---

### Source index (primary pages consulted)

- Allen HRA-3D README.pdf (licence, citation): <https://download.alleninstitute.org/informatics-archive/allen_human_reference_atlas_3d_2020/version_1/README.pdf>
- Allen Terms of Use: <https://alleninstitute.org/terms-of-use/> · Citation Policy: <https://alleninstitute.org/citation-policy/>
- ICBM 2009 licence: <https://www.bic.mni.mcgill.ca/ServicesAtlases/ICBM152NLin2009>
- HRA brain-male v1.3 metadata: <https://cdn.humanatlas.io/digital-objects/ref-organ/brain-male/v1.3/> · NIH 3D entry: <https://3d.nih.gov/entries/20960> · NIH 3D terms: <https://3d.nih.gov/terms>
- BodyParts3D licence (current): <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html> · (old): <https://lifesciencedb.jp/bp3d/info/license/index.html> · README: <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html> · paper: <https://pmc.ncbi.nlm.nih.gov/articles/PMC2686534/>
- Z-Anatomy licence: <https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/master/License.txt>
- SPL/NAC atlas: <https://openanatomy.org/atlas-pages/atlas-spl-nac-brain.html> · Slicer licence: <https://github.com/Slicer/Slicer/blob/main/License.txt>
- FreeSurfer licence: <https://surfer.nmr.mgh.harvard.edu/fswiki/FreeSurferSoftwareLicense> · <https://github.com/freesurfer/freesurfer/blob/dev/LICENSE.txt>
- HCP Open Access Data Use Terms: <https://www.humanconnectome.org/study/hcp-young-adult/document/wu-minn-hcp-consortium-open-access-data-use-terms>
- BrainGlobe: <https://github.com/brainglobe/brainglobe-atlasapi> (atlas_scripts/allen_human.py)
- Scalable Brain Atlas: <https://scalablebrainatlas.incf.org/human/NMM1103> · Neuromorphometrics EULA: <http://www.neuromorphometrics.com/wp-content/uploads/2013/06/NVM_Demo_License2013_v1.txt>
- Sketchfab download guidelines: <https://sketchfab.com/developers/download-api/guidelines> · API used: `https://api.sketchfab.com/v3/search`, `/v3/models/{uid}`
- Brainder: <https://brainder.org/brain-for-blender> · CIT168 OSF node: <https://osf.io/r2hvk/> · paper: <https://pmc.ncbi.nlm.nih.gov/articles/PMC5903366/>
- CC BY 4.0 / BY-SA 4.0 legal code: <https://creativecommons.org/licenses/by/4.0/legalcode>, <https://creativecommons.org/licenses/by-sa/4.0/legalcode> · CC FAQ: <https://creativecommons.org/faq/>
- Vercel compression allowlist: <https://vercel.com/docs/compression> · gltfpack: <https://github.com/zeux/meshoptimizer/blob/master/gltf/README.md> · three r182 libs: <https://unpkg.com/three@0.182.0/examples/jsm/libs/>
