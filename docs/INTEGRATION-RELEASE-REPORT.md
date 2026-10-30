# Integration release report (2026-10-29)

This report is for the founder, CD and whoever approves the release.

**Status: release candidate, not production-ready.** Concept B (Amendment 4) and the M2 exam-engine hardening
now live together on one branch, and that branch passes the full suite on a fresh production build.

Three groups of things must happen before the product counts as production-ready:

- real-device testing;
- database validation on staging;
- the remaining founder approvals.

Nothing has been merged into `main`. Nothing is deployed, and the production Supabase project wasn't
connected.

## Branch and commit

- **Branch:** `redesign/concept-b`, in worktree `~/projects/study-with-shabari-concept-b`.
- **Verified commit:** `5d9cc6d` is the commit the suite below ran against. The commit that adds this report
  and the preview notes changes only documentation.
- **`redesign/integration`:** a branch pointer to the same commit as `redesign/concept-b`, for the release
  candidate.
  - The integration brief asked for a separate branch; the CD's later note asked for the M2 fixes inside
    `redesign/concept-b`.
  - So the merge was done on `redesign/concept-b`, and `redesign/integration` marks the result.
- **History is intact:**
  - `redesign/cinematic` still ends at `c45e432`.
  - `main` still ends at `5ce8fdb`.
  - No branch was deleted, reset or force-pushed.

| Commit | What it is |
|---|---|
| `fb79e3b` | Amendment 4 refinements: serif display, de-carded layouts, two personalities, wording, facts test |
| `ea55170` | Merge of `redesign/cinematic` (M2) |
| `461bc76` | Grading-integrity and answer-key regression tests; pinning of older attempts |
| `7ca9df2` | One nav and footer across the site; staging configuration with gated migrations |
| `5d9cc6d` | Explorer label contrast; one primary action on the lesson result screen |

## What is merged

**From Concept B and Amendment 4 (visual and content):**

- **Type:** Newsreader serif display over Schibsted Grotesk text.
- **Colour:** white, navy and electric blue. Purple and teal appear only in scientific visuals.
- **Layout:** cards only where they're structural, one primary button per screen, school names set as type.
- **Two personalities:** MCAT is scientific and interactive (the 3D molecule hero, the three-tab dopamine
  explorer, the 522 instrument). Admissions is warm and editorial: writing prizes at pull-quote scale, her
  portrait, the founder-reported record card with its no-guarantee line.
- **Pages:** Research & Teaching, About, Pricing (both services), FAQ (the spec's 7 answers), and booking with
  an MCAT / College Admissions toggle and two Calendly slots.
- **Facts:** every fact comes from `docs/FOUNDER-SPEC.md` and is checked by `tests/unit/founder-facts.test.ts`.

**From M2 (engineering):**

- Question versions: every attempt is pinned to the exact content it started with.
- Lossless autosave and submit: the last unsaved answers travel with the submit.
- The server-checked clock and the late-delivery window.
- Newest-change-wins across tabs and backups.
- Recovery when signed out mid-exam.
- Retests of missed questions, with history, and misconception names in review.
- The security fixes: open redirect, reset-token handling, rate limits, lesson-publish race, lesson-action
  trust.
- The provisional 90-day contact-message policy, report-only until approved.
- The daily job also closes abandoned attempts.

**Added during integration:**

- Older attempts are pinned at deploy (`scripts/pin-legacy-attempts.ts`, and again by the daily job).
- Regression tests for historical grading and for answer-key exposure.
- Results, dashboard and 404 pages on the Concept B nav and footer.
- Build-time migrations gated to production or an opted-in staging database (`scripts/vercel-build.sh`).
- `docs/STAGING.md`.

## Conflicts and resolutions

**Text conflicts: none.** The two branches had changed disjoint sets of files since they diverged at `01bbb06`,
as `comm` of their two diffs shows. No file was resolved by taking one side.

**Semantic checks after the merge:**

- **Schema and migrations.** M2's `20261029132749_question_versions` only adds things: a table, two columns,
  a foreign key and RLS. Concept B changed no schema. The merged schema migrated cleanly from scratch on the
  test databases.
- **App pages outside the public layout** (exam results, dashboard, 404) still used the pre-redesign header.
  They now share the Concept B nav and footer. The exam runner keeps its own distraction-free bar.
- **Homepage answer-key preview** (M2 security finding 5). Concept B had already removed the inline practice
  question. The MCAT page shows a static picture of the interface, and the answer-key spec now guards this.
- **Booking journeys.** M2's practice journey and Concept B's booking toggle both end on `/book`. Both pass.
  The lesson result now opens the MCAT tab.
- **Contrast.** Axe on the merged `/mcat` found the graphics teal used as text (3.25:1). It now uses the
  text-safe teal (#0B6E6A).

## Test results (actual counts, on this commit)

Run against a fresh `next build` and `next start` on `sws_e2e_conceptb`, rebuilt from scratch. Integration
tests ran on `sws_test_conceptb`.

| Check | Result |
|---|---|
| `eslint` | exit 0 |
| `tsc --noEmit` | exit 0 |
| `vitest` (unit) | 119 passed (18 files) |
| `vitest` (integration) | 47 passed (9 files) |
| `vitest` total | **166 passed** (27 files), exit 0 |
| Playwright | **66 passed, 1 skipped by design** (a mobile-only spec under the desktop project), exit 0 |

**Playwright by spec:**

| Spec | Tests |
|---|---|
| a11y | 16 (14 pages, plus the exam flow and the lesson flow), all with no axe violations |
| exam-integrity | 11 |
| public | 6 |
| performance | 6 |
| accounts | 5 |
| m2-workflows, exam, admin, admin-editors | 3 each |
| practice-journey, journey-mobile, contact, answer-key | 2 each |
| mobile | 2 (1 run, 1 skipped by design) |
| privacy-network | 1 |

**Checks the brief asked for specifically:**

- **The MCAT and Admissions mobile journeys** (iPhone 14 viewport, Chromium) passed all steps: MCAT 8/8 and
  Admissions 4/4. Screenshots are in `.local/shots/concept-b/journey/`.
- **Grading stays unchanged after an admin edit.** Three tests in `tests/integration/grading-history.test.ts`:
  - after a submission;
  - while an attempt is in progress, which keeps the version it started with;
  - an older attempt, pinned at deploy, then edited.

  The E2E check "admin edits a published question mid-attempt" also passed.
- **Guest recovery after a refresh and an interrupted network.** The exam-integrity E2E cases passed:
  - refresh during autosave;
  - refresh during submit;
  - offline, then online;
  - 5xx retries;
  - two tabs;
  - a device clock jump;
  - session expiry;
  - guest to account.

  M2's practice journey (start, answer, refresh, restore, complete, review, retest, book) also passed.
- **Draft and unapproved content can't leak:**
  - the answer-key spec, as a guest and as a student;
  - the parked-attempt draft-content test;
  - previews of unapproved lessons are off unless `LESSON_PREVIEW=on`, so the production build hides drafts;
  - admin routes return the not-found page or a sign-in redirect for non-admins.

## Screenshots

All are from the production build, in the main checkout under `.local/shots/`:

- **`concept-b/v2/`:** the Amendment 4 reshoot of home, MCAT and Admissions at 1440 and 390, first screen and
  full page.
- **`integration/`:** the seven surfaces at 1440 and 390, each file with a `-1440` or `-390` suffix:

  | Surface | Files |
  |---|---|
  | 1. Home | `1-home` |
  | 2. MCAT | `2-mcat` |
  | 3. Admissions | `3-admissions` |
  | 4. Lesson | `4a` intro, `4b` teach, `4c` question, `4d` reveal |
  | 5. Exam | `5-exam` |
  | 6. Results | `6a` results, `6b` explanations |
  | 7. Booking | `7a` MCAT, `7b` Admissions |

  It also has the fallbacks: `8a-no-webgl` (WebGL disabled) and `8b-reduced-motion`. Both show the still
  molecule, with no canvas created. No console errors or warnings appeared during capture.
- **`concept-b/journey/`:** a screenshot for each journey step.

**Visual QA findings:**

- Fixed:
  - the old header on results, dashboard and 404;
  - "15-" breaking alone at the end of a line in headings on phones;
  - the teal text contrast;
  - the narrow "Start free" columns.
- Accepted: on 390 px the school names wrap onto three lines.

## Security and privacy status

- **Fixed, with tests:**
  - the open redirect after sign-in;
  - the reset token: it travels in the URL fragment, is removed from the address bar and history once read,
    and the chat widget stays off reset pages;
  - an unthrottled password reset and its timing leak;
  - unthrottled password re-checks, and reset links that survived a password change;
  - lesson edits trusting a form field;
  - the lesson-publish race;
  - autosave rate limits shared across a whole network;
  - unapproved AI lessons on preview deployments;
  - parked attempts showing draft content;
  - answer-key exposure (now with regression tests).
- **Privacy, unchanged from `PRIVACY-REVIEW.md` and passing its checks:**
  - Calendly on `/book` is the only outside host, and reading pages sets no cookies.
  - The funnel is aggregate only, with daily counts under 5 suppressed.
  - The retention purge is in place, and contact messages are report-only until the founder approves 90 days.
- **Accepted trade-offs, documented in `SECURITY-AUDIT.md`:**
  - the per-email login lockout;
  - sign-up saying an email "already exists".
- **Not checkable from here:**
  - whether Vercel Preview shares the production database;
  - Deployment Protection;
  - Supabase storage policies.

  The build no longer migrates on previews, whatever those settings are.

## Outstanding launch blockers

**Needs the founder:**

1. CD review of the v2 visuals before anything merges into `main`.
2. **Degree wording.** The spec's "Chemistry & Molecular Biology (Course 5-7)" and "Neuroscience (Course 9)"
   differ from MIT's catalog, which says "Chemistry and Biology" and "Brain and Cognitive Sciences"
   (`VERIFY.md` #14). The site follows the spec until she confirms.
3. Publication DOIs or URLs: one BMJ Rapid Response is corroborated, and the *Journal of Women's Health* piece
   wasn't found online.
4. Admissions prices, the three notes links and the two Calendly links.
5. Approval in the admin area: the dopamine lesson and the sample practice sets. Both were AI-drafted and are
   hidden in production until approved.
6. Approve, or change, the 90-day contact-message retention.
7. The full-length exam content: her own questions, through the import path.

**Needs engineering:**

8. Real-device testing on iOS Safari and Android Chrome. Everything here ran in Chromium, because WebKit isn't
   installed.
9. A Supabase load test: concurrent autosave and submit through the pooler.
10. Staging (`docs/STAGING.md`):
    - a separate Supabase project, Preview-scope variables and Deployment Protection;
    - then the post-deploy smoke spec on staging.
11. At the production deploy:
    - set `CRON_SECRET`;
    - the migration runs in the build;
    - run `scripts/pin-legacy-attempts.ts` once;
    - make one authorised call to the cron and check its counts.

## Deployment and rollback plan

The full plan is in `docs/STAGING.md`. Every step needs approval. In short:

1. **Staging deploy**, on a separate Supabase project behind Deployment Protection: seed it, create an admin,
   run the smoke spec, test on real devices, and run the load test.
2. **Founder approvals** (blockers 1–7).
3. **Production:** merge into `main` and deploy. The build migrates the database. Then pin the older attempts
   and check the cron.

**Rollback:**

- **Code:** Vercel's instant rollback to the previous deployment. The migrations on this branch only add, so
  older code runs unchanged against the new schema.
  - One exception: the new foreign key from `QuestionVersion` to `Question` is `ON DELETE RESTRICT`.
  - So after a rollback, older code can't delete a question that already has versions; it gets an error.
- **Data:** Supabase point-in-time recovery, or the backup taken before the deploy.
- **Content:** lesson and question versions are kept, and attempts stay pinned. A lesson is reverted by editing
  its draft back and approving it again; there's no one-click restore yet.
