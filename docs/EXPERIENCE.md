# The Beauty of Intelligence: prototypes, measurements and the choice

Branch `experience/beauty-of-intelligence`, written 2026-10-30. Everything here lives under
`/experience/*`, which answers a real 404 on the production deployment unless that deployment sets
`EXPERIENCE_PREVIEW=on` (`src/lib/experience/gate.ts`; the layout and every page call it before
rendering, the pages are prerendered, so the 404 is decided at build time). No live page changed.

| Route | What it is |
|---|---|
| `/experience` | Index of the three directions, the slice and admissions |
| `/experience/specimen` | I. Specimen: dopamine as a lit museum specimen, taken apart by functional group |
| `/experience/synapse` | II. Synapse: the same molecule as a neurotransmitter, vesicle to receptor to DAT |
| `/experience/instrument` | III. Instrument: an editorial 522 reveal in kinetic type, then her approach |
| `/experience/slice` | The vertical slice: Specimen → Synapse → 522 → one of her questions → booking |
| `/experience/admissions` | Admissions in a paper-and-serif world: the application as six stations |

## The three directions

**I. Specimen.** PubChem's conformer (CID 681) on ivory under a soft key light, with a museum label
(formula, molar mass, IUPAC name, source). Six scroll beats: the rest pose; the camera moves in to the
ring face-on; the molecule comes apart into the benzene ring, the 3-OH, the 4-OH and the ethylamine
side chain; a proton arrives at the amine (–NH₃⁺, "pKa ≈ 10, +1 at pH 7.4"); the two CH₂ carbons light
up ("achiral"); it reassembles, protonated. Nothing is hand-placed: groups come from the bond graph,
each group travels along the bond that joins it to the ring, the distance is the smallest that leaves
1.6 Å between every pair of atoms in different groups (2.10 Å travel, 2.21 Å clearance), the ring
moves the other way so the centroid never shifts, and the proton sits at the nitrogen's lone-pair
position at the conformer's own N–H length (`src/lib/experience/structure.ts`, 16 unit tests).
Drag, or the arrow buttons, to turn it.

**II. Synapse.** The hero molecule shrinks into a vesicle and becomes one of many instanced copies of
the real molecule. Seven beats: stored in vesicles; an action potential, Ca²⁺ entry and fusion; the
cleft; D1 (Gs, cAMP up) against D2 (Gi, cAMP down), with cAMP particles counted up and down from the
receptors' occupancy; reuptake through DAT. A working **Block DAT** switch stops reuptake in the scene
and the stills, and shows her line on cocaine and amphetamine. Every particle position is a pure
function of scroll phase (`src/lib/experience/synapse-choreography.ts`), shared by the WebGL scene and
the SVG stills, so scrolling back plays the story backwards. Rotates to a vertical layout on phones.

**III. Instrument.** No WebGL. An odometer reveal of the 522 that never shows a wrong number (the
roll starts and ends on the right digit), the 472–528 scale, "Clear. Simple. Built around you." from
her bio, and three tutoring points from founder-facts. Scroll writes per-beat weights as CSS
variables; every moving part is transform or opacity. A "Replay the reveal" button.

## Method (same for every route)

`scripts/experience-measure.mjs` against a production build (`scripts/e2e-server.sh`: `next build` +
`next start`, port 3170, database `sws_e2e_experience`), Chromium headless on the Metal GPU of an
Apple M5. One unmeasured warm-up visit per route and device first (image optimizer and route cache,
as a CDN would be warm); every measured load is a cold browser cache. Raw numbers:
`.local/shots/experience/measure.json`; the home page on `main` (a335152, built separately from
`git archive`): `.local/shots/experience/measure-main-a335152.json`.

- **Load:** iPhone 14 viewport (390×844, DPR 3), 4× CPU throttling; once unthrottled network, once
  "Slow 4G" (150 ms RTT, 1.6 Mbps). LCP, FCP and CLS from the browser's PerformanceObservers. JS =
  every script response, gzip size computed by the script, "initial" before the load event, "after
  idle" 6 s later (includes the lazy 3D chunk). INP proxy = the longest Event Timing entry over three
  clicks on visible buttons.
- **Scroll:** a scripted top-to-bottom scroll at 1,400 px/s driven by rAF; fps, p95 frame time,
  dropped frames (> 25 ms), long tasks; desktop 1440×900 unthrottled, phone 4× and 6× CPU.
- **Booking:** 40 scroll positions; is a "Book a free consult call" link on screen and uncovered
  (`elementFromPoint`), and is one on screen in the page content (not the header)?
- **Fallbacks:** `--disable-webgl --disable-3d-apis`, and `reducedMotion: "reduce"`.
- **WebGL cleanup:** five client-side visits (index → route → index); `renderer.info.memory` once live.
- **a11y:** axe, WCAG 2.1 A/AA.

## Measurements

Load (phone, 4× CPU):

| Route | LCP | LCP, Slow 4G | FCP / Slow 4G | CLS | INP proxy | JS initial, gz (parsed) | JS after idle, gz (parsed) |
|---|---|---|---|---|---|---|---|
| `/` on main a335152 | 396 ms | 1372 ms | 396 / 1372 ms | 0 | n/a (no buttons) | 217.7 KB (697 KB) | 478.5 KB (1648 KB) |
| `/` on this branch | 400 ms | 1208 ms | 400 / 1208 ms | 0 | n/a | 218.2 KB (698 KB) | 481.3 KB (1655 KB) |
| Specimen | 432 ms | 1288 ms | 432 / 1148 ms | 0.001 | 32 ms | 221.1 KB (704 KB) | 490.5 KB (1680 KB) |
| Synapse | 416 ms | 1312 ms | 416 / 1192 ms | 0 | 40 ms | 224.0 KB (714 KB) | 492.4 KB (1689 KB) |
| Instrument | 392 ms | 836 ms | 392 / 836 ms | 0.004 | 40 ms | 213.9 KB (684 KB) | 252.1 KB (789 KB) |
| Slice | 496 ms | 1244 ms | 496 / 1132 ms | 0.001 | 40 ms | 231.1 KB (737 KB) | 496.3 KB (1700 KB) |

Scroll (fps / p95 frame / dropped frames / long tasks):

| Route | Desktop | Phone, 4× CPU | Phone, 6× CPU |
|---|---|---|---|
| `/` on main | 59.7 / 16.7 ms / 0 / 0 | 60.0 / 16.7 ms / 0 / 0 | 59.9 / 16.8 ms / 0 / 0 |
| Specimen | 60.0 / 16.7 ms / 0 / 0 | 59.8 / 16.8 ms / 0 / 0 | 59.8 / 16.7 ms / 0 / 0 |
| Synapse | 59.9 / 16.7 ms / 0 / 0 | 59.9 / 16.7 ms / 0 / 0 | 59.9 / 16.7 ms / 0 / 0 |
| Instrument | 59.6 / 16.7 ms / 0 / 0 | 59.8 / 16.7 ms / 0 / 0 | 59.7 / 16.8 ms / 0 / 0 |
| Slice | 59.9 / 16.7 ms / 0 / 0 | 60.0 / 16.7 ms / 0 / 0 | 59.9 / 16.8 ms / 0 / 0 |

Everything else:

| | Specimen | Synapse | Instrument | Slice |
|---|---|---|---|---|
| axe (desktop; phone in e2e) | 0 violations | 0 | 0 | 0 |
| Reduced motion | no stage, no canvas, 6 stills inline, all text | no stage, 7 stills inline | no stage; number, scale and text inline | 13 figures, all text |
| WebGL off | stills swap per beat, 0 canvases, 0 errors, both CTAs | same, 7 stills; Block DAT swaps the still | unaffected (no WebGL) | same |
| Booking CTA on screen (phone / desktop) | 100% / 100% of positions | 100% / 100% | 100% / 100% | 100% / 100% |
| …in the page content, not the header | 22% / 24%; longest gap 2,074 / 3,291 px | 20% / 20%; 2,251 / 4,186 px | 27% / 29%; 1,404 / 2,478 px | 20% / 27%; 2,244 / 4,122 px |
| First viewport at 390×844 | yes | yes | yes | yes |
| Renderer memory over 5 visits | 4 geometries, 3 textures, every visit | 65 / 1, every visit | no WebGL | 4 / 3 |
| HTML document | 206 KB (24 KB gz) | 224 KB (21 KB gz) | 71 KB (10 KB gz) | 408 KB (42 KB gz) |

For comparison, the live home page shows a booking link at 27% (phone) and 51% (desktop) of
scroll positions; the prototypes' sticky bar keeps one at 100%, at the top, away from the chat bubble.

What these numbers can't tell apart: frame rate. Every route held 60 fps with no long tasks, even at
6× CPU, because CPU throttling doesn't slow the M5's GPU. The CDP main-thread time per second was
too noisy to rank anything (the same home page measured 57 and 41 ms/s on desktop), so it's in the
JSON but not used. A mid-range Android phone is the missing measurement.

## Scientific accuracy, claim by claim

**Specimen**

| On screen | Basis |
|---|---|
| C₈H₁₁NO₂; 153.18 g/mol; 4-(2-aminoethyl)benzene-1,2-diol | PubChem CID 681 record; formula recomputed from the atoms (`formulaOf`) |
| "a catechol ring (benzene with two adjacent –OH groups) attached to an ethylamine side chain"; neurotransmitter, precursor to NE and epinephrine | Her lesson, section 1, verbatim |
| Four groups: benzene ring, 3-OH, 4-OH, ethylamine side chain | Computed from the bond graph (`functionalGroups`), unit-tested |
| "3-OH: added by tyrosine hydroxylase"; "4-OH: already on tyrosine" | `roles().addedByTyrosineHydroxylase` (the OH meta to the side chain); tyrosine is 4-hydroxyphenylalanine and TH hydroxylates C3 (her lesson: tyrosine → L-DOPA by TH) |
| Each part moves along its cut bond; dashed = broken bonds | Computed (`explosion`), unit-tested: directions equal the cut bonds, clearance ≥ 1.6 Å, centroid fixed, exact reassembly |
| –NH₃⁺; "pKa ≈ 10, +1 at pH 7.4"; can't cross the blood–brain barrier | Her lesson, section 1. The added proton's position is computed (lone-pair direction, conformer N–H length; 100–120° to every neighbour, unit-tested) and the figure says so implicitly by animating it in |
| "about 99.7% of the amine is protonated: 1 / (1 + 10^(pH − pKa))" | Henderson–Hasselbalch with her pKa and pH (99.75%) |
| "Achiral"; "both side-chain carbons are CH₂: no stereocenter" | Her lesson; `stereocenters()` finds none in dopamine and exactly one in L-DOPA and L-tyrosine (so the check isn't vacuous) |

**Synapse**

| On screen | Basis |
|---|---|
| "Dopamine is made in the presynaptic terminal and stored in synaptic vesicles." | Standard neurobiology (TH and AADC in the terminal, vesicular packaging). Not in her lesson: **for her review** |
| "Tyrosine → L-DOPA (tyrosine hydroxylase; rate-limiting) → dopamine (aromatic L-amino acid decarboxylase)." | Her lesson, section 2, shortened (cofactors dropped) |
| "An action potential reaches the terminal. Calcium (Ca²⁺) flows in, and a vesicle fuses with the membrane, releasing dopamine into the synaptic cleft." | Standard (voltage-gated Ca²⁺ entry, exocytosis). **For her review** |
| "Dopamine diffuses across the synaptic cleft to receptors on the next neuron." | Standard. **For her review** |
| D1-like (D1, D5): Gs → ↑ adenylyl cyclase → ↑ cAMP; D2-like (D2, D3, D4): Gi → ↓ cAMP | Her lesson, section 4, verbatim. cAMP counts are relative (up from baseline beside D1, down beside D2), not quantities |
| DAT reuptake; MAO and COMT; HVA | Her lesson, section 3, verbatim (MAO/COMT/HVA are text, not drawn) |
| "Cocaine blocks DAT; amphetamine reverses DAT…" (on Block DAT) | Her lesson, section 6, verbatim |
| Receptors drawn with 7 transmembrane helices; DAT as a 12-helix bundle | GPCR and SLC6 transporter topology |
| "Stylized and not to scale… D1 and D2 sit side by side for comparison (in the striatum they are mostly on different neurons)." | Stated on screen as a simplification |

**Instrument**

| On screen | Basis |
|---|---|
| 522, January 2026, "as reported" | `founder-facts.mcatScore`; 522 only, no section scores (coordinator decision 05:50) |
| "Totals run from 472 to 528." | The MCAT's scale; already on the live site's score instrument |
| "I remember how overwhelming both processes felt, so I try to make things clear, simple, and built around you." | `founder-facts.bio`, verbatim |
| "1:1 live sessions on Zoom", "A study plan built around your test date", "Focus on C/P, B/B, and P/S" | `founder-facts.mcatTutoring.points`, verbatim |
| Headline "One-on-one MCAT tutoring from an MIT premed who scored a 522 in January 2026." | `founder-facts.mcatTutoring.headline` |

## Scores and the choice

| | Specimen | Synapse | Instrument |
|---|---|---|---|
| Originality | 4: an exploded view of the real conformer, computed, is unusual anywhere | **5**: the actual molecule as instanced particles in a scrubbable synapse, with a switch that changes the outcome | 2: a number reveal is a known editorial pattern |
| Scientific meaning | **5**: every label is derived from the structure or quoted from her lesson, and it teaches exactly what Q6 and Q2 test (charge, BBB) | 4: her receptor and clearance text, but three captions are mine and need her review; more simplification | 1: no science; credibility only |
| Usability | 4: one idea per beat, readable on a phone (split stage) | 3: dense; many labels; small particles on a phone | **5**: simplest |
| Performance | 490 KB JS after idle (lazy 3D), LCP 1.29 s on Slow 4G | 492 KB, 1.31 s | **252 KB, 0.84 s**, no GPU at all |

**Choice: Specimen leads.** The founder's order (Specimen → Synapse → 522 → learning → booking)
wasn't taken as given; the evidence agrees with it for the lead, but not for the reason of order:
Specimen is the only direction whose hero *is* the lesson. Its beats state, and let you see, the two
facts her Q6 and Q2 ask about, so the slice's "moment of understanding" follows from the hero rather
than sitting after it. Synapse is the most original and the second act; it costs the same bytes (one
shared 3D chunk) and loads lazily in the slice. Instrument wins on performance by a wide margin but
teaches nothing; its 522 band is used in the slice as a static section, where it costs nothing. If the
founder wants the lightest possible hero, Instrument is the honest alternative, and the numbers above
say so.

## The vertical slice (`/experience/slice`)

1. **Specimen** hero with the molecule interaction (drag, turn buttons, beat navigation), the museum
   label, and "Book a free consult call" in the sticky bar (always on screen, at every width).
2. **The science** from her lesson text, beat by beat; then the **Synapse** (second scene, mounted
   only within a screen of the viewport).
3. **The 522**, on its scale, "as reported", with her headline and her approach in her words.
4. **The moment of understanding:** her Q6 ("At pH 7.4, dopamine's net charge is approximately"),
   pick an answer, optionally say how sure you are, check (server action `checkDopamineAnswer`; the
   page has stems and choices only), see her explanation and a calibration note, then **move the pH**
   and watch the amine take or lose its proton (Henderson–Hasselbalch with her pKa), then **her Q2**
   (L-DOPA and the blood–brain barrier), then **what you learned**: her lesson line plus the two
   explanations, and "n of 2 right". No scaled score of any kind.
5. **Booking:** "Start with a free consult call." with her payment note, `/book?service=mcat`.

## Budgets

| Budget | Result |
|---|---|
| Hero LCP < 2.5 s, mobile emulation | **Met**: 0.39–0.50 s (4× CPU), 0.84–1.31 s with Slow 4G. An earlier run read 2.50 s for Specimen on Slow 4G: the image optimizer was cold, and the still was preloaded twice; both fixed, and the measurement now warms the server first |
| CLS < 0.05 (≤ 0.1) | **Met**: 0.004 worst |
| INP ≤ 200 ms | **Met** as a proxy: 40 ms worst (Event Timing, three clicks, 4× CPU). Not a field INP |
| ≤ 250 KB extra gz JS beyond the home page | **Met**: slice 496.3 KB after idle against 478.5 KB for `/` on main (+17.8 KB); initial +13.4 KB |
| Initial JS for `/` ≤ +80 KB over main | **Met**: 218.2 KB against 217.7 KB (+0.5 KB); total +2.8 KB |
| 3D bundle lazy, after first paint | **Met**: requested after `load` and idle; ~270 KB gz arrives "after idle" |
| 55+ fps desktop, 30+ fps on 4× mobile | **Met** on this machine: 59.6–60 fps everywhere, 0 dropped frames, 0 long tasks. GPU not throttled (see above) |
| No growth in `renderer.info.memory` over 5 route changes | **Met** after a fix: the Specimen leaked one texture per revisit (it disposed the PMREM texture, not its render target). Now constant; and a hidden route stops drawing |
| axe 0 serious/critical, keyboard, visible focus | **Met**: 0 violations; turn buttons, beat navigation (moves focus to the beat's heading), Block DAT switch, pH slider, journey tabs (arrows, Home, End) |
| 390×844: CTA in the first viewport, never under the chat bubble | **Met**: sticky top bar, tested at five scroll positions, outside a 100×100 bottom-right corner and uncovered |
| No overflow at 360/390/768/1280/1440 | **Met** (tested at three scroll positions per route) |

## Founder questions and copy requests

Conflict to settle: the coordinator's 05:50 rules for these prototypes say **522 only, no section
scores, "as reported"**. `docs/FOUNDER-APPROVAL.md` in the main checkout was updated at 06:05: Shabari
approved the section scores, and the score is to be stated "plainly … with no 'Shabari reports'
hedge". The prototypes follow the coordinator; the switch is one file, `src/lib/experience/score.ts`.

Copy I wrote that isn't hers or founder-facts, for approval (nothing else is new):

- Synapse captions for beats 1–3 (quoted in the accuracy table) and its scale note.
- Specimen: "A free lesson written by Shabari." (the lesson page says "Written by Shabari."); "Four
  parts, one molecule"; "Each part moves out along the bond that joins it to the ring. Dashed lines
  are the broken bonds."; the 99.7% line; "A stereocenter needs a carbon with four different groups.
  Both side-chain carbons are CH₂, and the ring carbons have only three neighbours, so there is none."
- Slice: "Check your understanding", "One of Shabari's six dopamine questions. Pick an answer to see
  her explanation.", the four calibration notes after "How sure are you?", "What you learned",
  "n of 2 right. The other four questions are in the free lesson."
- Instrument and admissions headings: "522, on the scale", "One-on-one", "The application, station
  by station", "When to start", "Her own application".

## Found along the way (not changed)

- `src/components/cinema/scene/molecule-scene.tsx` (the live hero) disposes its PMREM *texture* and
  never the RoomEnvironment, the same pattern that leaked here once Next keeps a visited route in a
  hidden Activity. Not measured on the live hero; worth the same two-line fix there.
- `e2e/performance.spec.ts`, `exam-integrity`, `practice-journey`, `m2-workflows` and `journey-mobile`
  write screenshots into `~/projects/study-with-shabari/.local` unless `M2_SHOTS_DIR` and
  `JOURNEY_SHOTS_DIR` are set. The runs here set both to this worktree.

## Reproduce

```
E2E_DATABASE_URL=postgresql://shabari@127.0.0.1:54329/sws_e2e_experience E2E_PORT=3170 \
  NEXT_DIST_DIR=.next-e2e-experience bash scripts/e2e-server.sh      # build + start
E2E_PORT=3170 node scripts/experience-measure.mjs                     # numbers → .local/shots/experience/measure.json
E2E_PORT=3170 node scripts/experience-shots.mjs                       # screenshots → .local/shots/experience/
E2E_PORT=3170 E2E_DATABASE_URL=… npx playwright test e2e/experience-*.spec.ts
```

Screenshots: `.local/shots/experience/<route>/desktop-*.png` (Chromium, 1440×900) and
`iphone14-*.png` (WebKit, iPhone 14) at every beat; side-by-side sheets in
`.local/shots/experience/compare/` (`desktop-first`, `desktop-mid`, `phone-first`, `phone-mid`, and
the `-webgl-off` and `-reduced` variants of each).
