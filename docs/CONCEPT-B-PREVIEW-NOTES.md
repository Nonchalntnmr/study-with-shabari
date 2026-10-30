# Concept B v2: Amendment 4 refinements (2026-10-29)

This v2 section is for CD review. The original v1 notes follow below, unchanged. Nothing has been merged into
`main`, nothing is deployed, and nothing touched Supabase.

**What's in v2.** `v2/` holds the reshoot of home, MCAT Prep and College Admissions at desktop 1440 and mobile
390: first screen (`*-1440.png`, `*-390.png`) and full page (`*-full.png`).

- **Source:** the production build (`next build` and `next start`) of `redesign/concept-b`. The final commit
  is named in `docs/INTEGRATION-RELEASE-REPORT.md`.
- **Data:** a freshly seeded throwaway database. The dopamine lesson and sample sets are approved there only.
- **Console:** no errors or warnings while taking the shots.

## The ten items

| # | Item | Done |
|---|---|---|
| 1 | Editorial typography | Newsreader serif for display headlines and numerals (522, record, prices, Mudzi figures) and Schibsted Grotesk for text, with more whitespace and stronger hierarchy. The exam stays in Atkinson. |
| 2 | De-card | Cards remain only for pricing, the 522 instrument and the record card. Checkmark lists became hairline rows. Each screen has one blue button, with secondary actions as text links; the nav's "Book a Call" is now an outline button. School names are set as type, not tiles. Her portrait runs large, in asymmetric splits on Home and Admissions. |
| 3 | Two personalities | **MCAT** is scientific and interactive: the molecule, the three-tab explorer, the 522 instrument, data rows. **Admissions** is warm and editorial: writing prizes at pull-quote scale beside her portrait, guidance and mentoring at the centre, a generous measure. Both use the same tokens. |
| 4 | Preserve | The explorer, lesson, learning loop, exam engine and all privacy and security work are kept. The M2 hardening was merged in (next section). |
| 5 | Degree wording | "B.S. candidate, MIT Class of 2027: Chemistry & Molecular Biology (Course 5-7) and Neuroscience (Course 9)" on Home and About. |
| 6 | BMJ wording | The strip says "BMJ Rapid Responses". The publications list keeps "Rapid Response, The BMJ". |
| 7 | Verify claims | A test checks every fact on the site against `docs/FOUNDER-SPEC.md`; only the approved wording changes are allowed. The record card is labelled "My high school record (founder-reported)", with "GPA 4.00/4.00", SAT, ACT, "IB Diploma 40/45" and the no-guarantee line. `VERIFY.md` records that these are founder-reported and that no documents have been seen. |
| 8 | Historical grading | Integration tests cover three cases. **After a submission:** editing the answer key, stem, a choice, its rationale and the explanation leaves the results, review and score unchanged; the only change is a "since revised" note. **In progress:** an attempt keeps its version. **Older attempts:** those created before versioning are pinned at deploy. |
| 9 | Answer-key exposure | An E2E test runs as a guest and as a signed-in student. It checks raw HTML with the server-rendered data, the DOM and the autosave JSON on public pages, practice, the exam runner, the lesson's teach and question steps and the admin routes. None of them carry key fields or explanation or rationale text. Positive controls confirm the detector finds them on the results page and on the reveal. |
| 10 | Reshoot and suite | Below. |

## Merged with M2

`redesign/cinematic` was merged into `redesign/concept-b` with no textual conflicts. The two branches had
touched disjoint files. After the merge:

- the results, dashboard and 404 pages were moved onto the Concept B nav and footer;
- the lesson result screen keeps one primary action.

## Suite on this build

| Check | Result |
|---|---|
| eslint | exit 0 |
| tsc | exit 0 |
| vitest | 166 passed: 119 unit and 47 integration |
| Playwright | 66 passed, 1 skipped by design, exit 0 |

The Playwright run includes:

- 16 accessibility tests with no violations;
- the privacy network check (Calendly on `/book` is the only outside host, and reading pages sets no cookies);
- both journeys (MCAT 8/8, Admissions 4/4);
- the answer-key audit;
- the 11-case exam-integrity matrix.

## For CD review

1. Serif display on white: confirm the weight (430) and the size steps.
2. The admissions composition: the portrait beside the writing prizes, and the record placed lower on the page.
3. The nav's "Book a Call" as an outline button, to keep one blue button per screen.
4. The section titles I wrote (listed in v1 below). They are unchanged except "Mentoring students through MIT
   programs."

## Still blocking

**Founder:**
- the degree wording: MIT's catalog says "Chemistry and Biology" and "Brain and Cognitive Sciences" (`VERIFY.md` #14);
- publication DOIs or URLs;
- admissions prices;
- the notes and Calendly links;
- approval of the dopamine lesson and the sample sets;
- the 90-day contact-message period.

**Engineering:**
- real-device testing (iOS Safari, Android Chrome);
- a Supabase load test;
- the staging environment (`docs/STAGING.md`);
- setting `CRON_SECRET`;
- running the migration and `scripts/pin-legacy-attempts.ts` at deploy.

---

# Concept B: preview notes (2026-10-29)

These are for your review before anything replaces the homepage. Nothing is deployed, and `main` and the
current homepage on `redesign/cinematic` are unchanged.

- **Branch:** `redesign/concept-b`, created from `redesign/cinematic` at `01bbb06`. Worktree:
  `~/projects/study-with-shabari-concept-b`.
- **Screenshots:** taken from the production build (`next build` and `next start`) against a throwaway local
  database, in Chromium. There's no dev indicator in them.

| File | What it shows |
|---|---|
| `home-1440.png`, `home-1440-full.png` | Home, desktop: first screen and full page |
| `home-390.png`, `home-390-full.png` | Home, iPhone 14 width: first screen and full page |
| `mcat-1440.png`, `mcat-1440-full.png` | MCAT Prep, desktop |
| `mcat-390.png`, `mcat-390-full.png` | MCAT Prep, phone |
| `admissions-1440.png`, `admissions-1440-full.png` | College Admissions, desktop |
| `admissions-390.png`, `admissions-390-full.png` | College Admissions, phone |
| `journey/` | The two journey tests, one screenshot per step, plus `report.json` |

**What the preview data is.** The preview database publishes the three sample practice sets, and it approves
the AI-drafted dopamine lesson through the test fixture, so you can see them. On the live site both stay hidden
until Shabari reviews them:

- The sample sets are in REVIEW.
- The lesson button reads "The interactive lesson opens here once Shabari has reviewed it."

The Calendly links are test stubs.

## Preserved

- **The interactive 3D dopamine model** now sits in the home hero, framed on white. It uses PubChem's
  coordinates and the computed pose with no overlapping atoms. You can drag to rotate it, and it shows the
  still image when motion is reduced or WebGL is missing.
- **The dopamine lesson and learning loop** are unchanged: misconceptions, confidence before the reveal, the
  retest, the honest result screen, and the AI-content approval rules with the draft badge. The lesson is
  reached from MCAT Prep ("One molecule, three sections") and from the home page's "Start free" section.
- **The three readings of dopamine** (chemist, biochemist, psychologist) keep their measured bond lengths, the
  synthesis scheme and the pathway diagram. They're now three tabs on the MCAT page.
- **The 522 visualisation** stays: true-value bars and a one-time draw. It's in the MCAT Prep hero.
- **The engine and platform are untouched:** exam engine, practice platform, autosave, admin publishing,
  analytics, privacy fixes and security headers. The exam keeps its own calm interface.
- **The tests:** the mobile journey test was adapted to the new structure, and a second journey was added for
  admissions. Accessibility and privacy checks now cover the new pages.
- **All branches and history.** The cinematic homepage is intact on `redesign/cinematic`.

## Removed

- **The pinned scroll story:** the sticky full-screen stage, chapter pinning and scroll-scrubbed camera. The
  components remain in the code, unused on this branch, and in full on `redesign/cinematic`.
- **The old visual language on public pages:** the histology palette, the Newsreader serif, highlighter-yellow
  headline words, gradient page headers, and the glow in the call-to-action band.
- **The home page's inline practice question.** It read the sample bank directly and sent its answer key to
  the browser, which the security review flagged. The MCAT page now shows a picture of the exam interface and
  a live list of the published sets.
- **The old navigation, and `/mcat-tutoring`.** The old URL now redirects permanently to `/mcat`.
- **Two pieces of copy:**
  - "College application help, too" in the MCAT custom plan. Admissions is its own service now, so the MCAT
    plans follow the spec's wording.
  - The FAQ line calling the practice questions "my own originals". The sample sets weren't written by
    Shabari.

## Redesigned

**Visual system.**

- Colours:
  - white `#FFFFFF`;
  - light blue-grey `#F4F7FB` for section backgrounds;
  - deep navy `#0B1F44` for type and the closing bands;
  - electric blue `#1F5BFF` for buttons and links, with white text at 5.3:1 contrast.
- Purple `#6A4FD6` and teal `#0E9F9A` appear only inside scientific visuals: oxygen and nitrogen atoms,
  pathway lines and diagram highlights.
- There are no gradients, no glow and no neon. Surfaces are flat, with hairline borders.

**Typography.** One family, Schibsted Grotesk, for both headlines and text. Headlines are bold with tight
tracking. This fits the spec's "modern sans-serif type, bold headlines", and on white it reads as official and
precise. A single family also keeps the dense factual pages (record, research, pricing) calm. The serif
looked editorial on the earlier grey-green field but made the white pages feel like a magazine rather than an
institution. Exam reading text stays in Atkinson Hyperlegible.

**Navigation** follows the spec exactly: MCAT Prep, College Admissions, Free Practice Test, Free Notes,
Research & Teaching, Pricing, About, then a blue "Book a Call" button. The menu collapses below 1180 px.

**Home:**

1. The spec headline, the 3D molecule and two calls to action.
2. Two equal panels:
   - MCAT Prep: "522 MCAT — 132 B/B, 132 P/S, 131 C/P", with section bars on the real 118–132 scale.
   - College Admissions: "Admitted to MIT, Yale, Columbia, Brown, Dartmouth, and Penn (Benjamin Franklin
     Scholar)", with plain-text school tiles. There are no logos.
3. "Book a free 15-min call", then the credibility strip.
4. Two services side by side, "Start free. No signup.", "Hi, I'm Shabari" with her photo and the spec bio,
   all seven FAQ answers, and a closing booking band.

**MCAT Prep (`/mcat`):**

1. Hero with the 522 instrument.
2. Tutoring (spec section 1).
3. The interactive "One molecule, three sections" explorer and the free lesson.
4. The free practice platform (spec section 2), with honest status.
5. Free notes (three cards; "Coming soon" until the links exist).
6. MCAT pricing with the Zelle note.
7. MCAT booking.

**College Admissions (`/admissions`):** built to the same depth and order as the MCAT page.

1. School tiles, the spec headline and a high-school record card (GPA, SAT, ACT, IB).
2. The record: IB subject scores on their real 1–7 scale, the Extended Essay and activities.
3. What I help with (six items) and the two-step timeline from the FAQ answer.
4. Why trust me with your essays.
5. Mentoring.
6. Admissions pricing ("Priced on your consult call" until you supply prices) with the Zelle note.
7. Admissions booking.

**Shared pages:**

- **Research & Teaching:** a research timeline, publications, teaching, honors and Mudzi.
- **About:** her photo and bio, teaching, and Mudzi.
- **Book:** an MCAT / College Admissions toggle with two Calendly slots. `?service=` opens the right one, and
  there's an honest fallback when a link isn't set.
- **Pricing:** both price lists, with the payment note under each.
- **FAQ:** the spec's seven answers, then the platform answers.
- **Footer:** links to every section.

**Mobile.** On the home first screen, both "Book a free 15-min call" and "Free practice test" are visible.
On MCAT Prep and College Admissions, booking is on the first screen.

## Checks on this build

- **Playwright:** 42 passed, 1 skipped by design (a mobile-only test under the desktop project). That includes:
  - the MCAT journey (home → MCAT → lesson: miss, diagnose, retest → result → booking);
  - the admissions journey (home → admissions → credentials → pricing → booking on the Admissions tab);
  - 16 accessibility scans with no violations, including the new pages;
  - the privacy check: on every page the only outside host is Calendly on `/book`, and reading pages sets
    no cookies.
- **Unit and integration tests:** 107 + 27 passed.
- **Browser console:** no errors or warnings while taking the preview screenshots.

## For your decision

1. **Typography:** one sans family (above), or a serif for display headlines only.
2. **Lines I wrote** around the spec's facts. Please confirm or replace:
   - hero subline: "Shabari Shankar, B.S. in …. MCAT prep and college admissions consulting, one on one.";
   - section titles:
     - "Two services, one teacher."
     - "Start free. No signup."
     - "One-on-one, built around your test date."
     - "One molecule, three sections."
     - "Practice in a test-day interface."
     - "Every option starts with a free call."
     - "The record behind the admissions."
     - "The whole application, piece by piece."
     - "Three MIT writing prizes, and a news editor's desk at The Tech."
     - "Mentoring students through MIT programs."
     - the Research page title "Immunology, computational genomics, surgical sustainability, and teaching at MIT."
3. **Section order:** scores are listed B/B, P/S, C/P everywhere, following the spec's hero line.
4. **Practice status line:** "Available now: short sample sets. Full-length C/P, B/B and P/S sections are
   coming as Shabari adds her questions." The full-length sections need her questions.
5. **Open facts** are in `docs/VERIFY.md`: admissions prices, the notes and Calendly links, publication wording
   (including "Published in The BMJ" for Rapid Responses), and a few older experience lines.

## Known gaps

- Practice, notes, contact, sign-in and legal pages take on the new palette and type but weren't individually
  redesigned.
- No real-device testing yet. The phone screenshots are iPhone 14 emulated in Chromium, because WebKit isn't
  installed.
- Exam-engine reliability work (M2) is happening on `redesign/cinematic`. It will need merging into
  `redesign/concept-b` after you approve.
