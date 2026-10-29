# Creative direction: Study with Shabari homepage redesign (v1)

Owner: creative direction (Claude, for Nishanth). Implementer: the Antigravity Claude Code session.
Scope: public marketing pages, starting with the homepage. **Do not change** the exam runner, dashboard,
admin, auth, database or API behaviour. Exam UI keeps its calm palette and Atkinson reading font.

## Audit: why the current homepage reads as a template

- Two-column hero (headline left, score card right) with a sky-to-white gradient wash: the default SaaS hero.
- Four identical rounded icon cards ("How I can help") with hover lift: the SaaS card kit.
- Every section is the same recipe: small label, H2, grey paragraph, grid. No rhythm, no scene changes.
- Geist + generic blue (#2563eb) + navy: indistinguishable from any startup.
- Nothing on the page is *about science*. Shabari studies biochemistry and computational neuroscience,
  and that is the most distinctive asset we have. It is unused.
- The 522 is a small card, not a moment.

## The idea

**One molecule, three sections.** The page is built around a single, accurately modelled molecule:
**dopamine** (C8H11NO2). It is the rare thing that is genuinely tested in all three science sections:

1. Chem/Phys: structure and properties (catechol ring, aromaticity, the ionisable amine).
2. Bio/Biochem: its synthesis, tyrosine → L-DOPA (tyrosine hydroxylase) → dopamine (aromatic L-amino acid decarboxylase).
3. Psych/Soc: its role in reward and learning (mesolimbic pathway).

It also fits Shabari (biochemistry + computational neuroscience). The scroll story is the camera moving
into this molecule and the molecule being "read" three ways. That is the narrative purpose of every animation.

Accuracy rule: the 3D model must use real coordinates. Use the PubChem 3D conformer for CID 681
(public domain); commit it as `src/content/molecules/dopamine.json` with the source URL in the file.
If PubChem can't be reached, build geometry from standard bond lengths/angles and caption the model
"illustrative model". Any label shown (atom, enzyme, pathway step) must be correct. Decorative visuals
are never labelled as data.

## Tokens

Palette: histology, not SaaS. Taken from H&E staining, the colours of a stained tissue slide.

| Name | Hex | Use |
|---|---|---|
| Slide | `#EEF1EF` | Page background (cool glass grey-green, not cream) |
| Hematoxylin | `#2E2560` | Primary text-on-light accents, carbon atoms, headings on light |
| Eosin | `#D9577E` | Single accent: primary CTA, oxygen atoms, the active state in the story |
| Ink | `#151A28` | Body text |
| Fixative teal | `#1E7F7C` | Nitrogen atoms, links, secondary highlights |
| Highlighter | `#F3E15A` | Reserved for the 522 moment only (the original site's highlighter) |

Hero and the pinned story sit on a deep hematoxylin field (`#1B1640` → no gradient wash; a single flat
field with real 3D lighting doing the depth). Everything after returns to Slide. Check AA contrast on every pair.

Type:
- Display: **Newsreader** (variable, use optical size; large, tight leading 0.95–1.05, weight 400–500). Editorial, scientific-journal feel.
- UI/body: **Schibsted Grotesk** (replace Geist on public pages). 17–18px body, 1.55 line-height, ≤ 70ch.
- Exam/reading: keep Atkinson Hyperlegible. Data/numbers: tabular figures of the body face, not a mono.
- Avoid: all-caps eyebrow labels above every heading, one-word-coloured headlines, "→" on every link, middle-dot meta strings.

## Page structure

```
[1 HERO  full viewport, dark field]
 Newsreader H1 (left, 6/12 cols)        3D dopamine, lit, slowly turning (right, bleeds off edge)
 intro + 2 CTAs                         pointer = gentle orbit; drag = rotate
 small credential line: "MCAT 522 · January 2026"
[2 STORY  pinned ~300vh, scroll-scrubbed]  camera dollies in; molecule re-lit per chapter
 chapter text on a solid panel (never over the moving model)
   2a Chem/Phys  -> ring + amine highlighted, bond lengths appear
   2b Bio/Biochem-> model steps back; tyrosine → L-DOPA → dopamine built atom by atom, enzymes named
   2c Psych/Soc  -> molecule recedes into a simple, labelled mesolimbic pathway diagram (SVG, accurate, simplified)
[3 HOW I HELP  light Slide]  NOT cards: a single editorial index list, 4 rows, big Newsreader titles, one line each, whole row is the link
[4 THE 522]  one horizontal instrument: 472…528 scale with ticks, a highlighter mark at 522;
             three section scales (118–132): CP 131, BB 132, PS 132. Scroll draws the marks once. Nothing else on screen.
[5 PRACTICE]  the real exam interface, live and usable (existing ExamPreview), framed as test software, not a mockup
[6 FOUNDER]  editorial profile: portrait slot, credentials from src/lib/site.ts `founder.experience`,
             teaching philosophy (existing copy), booking CTA
[7 PRICING teaser + final CTA]  existing PlanCards restyled to the new tokens, Zelle note kept
```

Copy (facts only from `src/lib/site.ts`; no new claims):
- H1 option A: "MCAT tutoring from a 522 scorer." Option B: "One molecule. Three sections. One plan built around you." Try both in screenshots; pick by readability.
- Intro: "I'm Shabari, an MIT student in biochemistry and computational neuroscience. I scored 522 on the MCAT in January 2026. My notes and practice sets are free, and I tutor the three science sections."
- CTAs keep their current names: "Book a free 15-min call", "Try a free practice set".

Portrait: there is no photo in the repo. Build the slot (4:5, duotone-ready) with a clearly neutral placeholder,
**no stock image, no AI face**. Founder will supply the photo.

## Engineering

- `three` + `@react-three/fiber` + `@react-three/drei` for the molecule only. Scroll-linking via the existing
  `motion` package (`useScroll`/`useTransform`). Don't add GSAP unless motion can't do the pin cleanly; say why if you do.
- The canvas is a client component loaded with `next/dynamic` (`ssr: false`), homepage only. H1 and CTAs are server-rendered text so LCP isn't the canvas.
- Instanced spheres + cylinders, one environment light rig, no post-processing heavier than a subtle AO/bloom (prefer none). DPR clamp `[1, 1.75]`. `frameloop="demand"` when off-screen (IntersectionObserver).
- Fallbacks: `prefers-reduced-motion` → static, pre-rendered SVG/PNG of the same molecule and no pinning; no WebGL or `navigator.hardwareConcurrency <= 4` on mobile → same static fallback. Chapters then stack as normal sections with a static diagram each.
- Mobile (< 768px): no pinning; hero stacks (H1 → molecule ~55vh → CTAs); story chapters stack.
- CSP: three needs no external hosts; keep the strict CSP. If a worker or `blob:` is required, add the narrowest directive and note it.
- Budgets: homepage JS for the 3D chunk ≤ 250 KB gzip, loaded after first paint; Lighthouse mobile performance ≥ 85; CLS 0; axe 0 violations.

## Acceptance (send evidence, not descriptions)

Save screenshots to `.local/shots/redesign/` (inside the project, not /tmp) so creative direction can review:
`hero-1440.png`, `story-1440-{a,b,c}.png` (scrolled to each chapter), `522-1440.png`, `founder-1440.png`,
`full-1440.png` (full page), `hero-390.png` and `full-390.png` (iPhone 14), `reduced-motion-1440.png`.
Then run lint, tsc, vitest, Playwright (incl. axe) and paste the summary lines. Commit when green.
Do not deploy, change DNS or spend money.

## v1.1 — after reviewing the founder's reference (screen recording, 2026-10-29 07:30)

The reference is an Instagram reel ("The era of boring websites is over") of a real-estate site ("Eastline").
What we take from it, as principles only (no assets, layout or wording copied):

- **The camera move is the story.** Scrolling drives a continuous, smooth camera move through a space.
  Ours is the camera moving into the dopamine model. Scrub must be damped and never jitter.
- **Light and airy, full-bleed.** The reference is bright, photographic and edge-to-edge. **Change from v1:**
  the hero and story are on the light Slide field (`#EEF1EF`), not a dark field. The molecule is lit like a
  studio object on a pale backdrop (soft key light, contact shadow). Hematoxylin `#2E2560` carries the type.
- **Quiet chrome.** Minimal, centred wordmark and a thin nav that recedes on scroll. Huge whitespace. One
  idea per screen.
- **Photography gets space.** The founder portrait is now supplied: `public/images/shabari-portrait.jpg`
  (700×875, 4:5, in the main checkout; copy it into the worktree). Use it large in the founder section with
  `next/image`, real alt text ("Shabari Shankar"), no filters that change her skin tone, no duotone. A subtle
  scroll parallax (≤ 40px) is the only motion on it. Do not use it in the hero.
