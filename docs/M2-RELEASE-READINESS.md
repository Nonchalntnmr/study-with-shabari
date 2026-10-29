# M2 release readiness: the exam engine (2026-10-29)

**Bottom line:** the practice exam engine is in good shape for **free practice sets**. Answers are never
silently lost in any failure mode we could reproduce. History can't be rewritten by edits. Time is the server's.
The answer key never reaches the browser before submit.

**Not production-ready yet,** and passing tests don't change that. Four things stand in the way:

- It hasn't run on real iPhones (WebKit isn't installed here).
- There has been no load test at class scale on Supabase.
- Three deployment settings are unverified: Vercel previews and the database, storage policies, and `CRON_SECRET`.
- There are no full-length exams, because Shabari's own content hasn't been imported.

Details: `EXAM-ENGINE-AUDIT.md` (engine), `SECURITY-AUDIT.md` (security), `PRIVACY-REVIEW.md` (privacy, updated
for M2).

## What changed (branch `redesign/cinematic`)

| Commit | What |
|---|---|
| `f7ac83d` | Security fixes from the independent review: open redirect, reset-token handling, reset throttling and timing, password re-verify throttling, lesson-action trust, the publish race, per-attempt autosave limits, preview opt-in |
| `0d53bb5` | Exam engine: pinned question versions; lossless autosave and submit; newest-change-wins; tab sync; signed-out recovery; the server-checked monotonic clock; late delivery; retest and history; misconception names in review; question version history; AI-question approval; stricter publish rules |
| `9b5af99` | Retention: a provisional 90-day contact-message policy (report-only until approved); the daily job closes abandoned attempts |
| (this) | The three M2 docs, the performance spec, screenshots, privacy-review updates |

The migration `20261029132749_question_versions` (with RLS) is applied to **local `sws_dev`** only. Supabase
needs it at deploy (`prisma migrate deploy`).

## Verified results (real command output, final run)

```
npx eslint                → exit 0
npx tsc --noEmit          → exit 0
npx vitest run            → Test Files 25 passed (25) · Tests 161 passed (161)
npx playwright test       → 60 passed · 1 skipped (mobile-only spec under desktop) · exit 0
                            (clean production build, fresh sws_e2e; log: .local/m2-e2e.log)
```

**Guest practice journey** (`e2e/practice-journey.spec.ts`). Every step passed. Screenshots are in
`~/projects/study-with-shabari/.local/shots/m2/journey/01…08-*.png`, with `report.json` alongside.

| Step | Result |
|---|---|
| 1. Guest starts a free practice set | pass |
| 2. Answers questions and refreshes | pass |
| 3. Progress is restored exactly (answers, flag, position) | pass |
| 4. Completes the set | pass |
| 5. Results and explanations are accurate (score matches the key; four rationales per question) | pass |
| 6. Reviews mistakes (Missed filter) | pass |
| 7. Retests the missed questions (2/2, linked both ways, history shown) | pass |
| 8. Reaches booking (Calendly embed, stubbed) | pass |

The original iPhone 14 lesson journey (`e2e/journey-mobile.spec.ts`) still passes 8 of 8. The registered-student
workflow, admin workflows (AI approval, version history, editing mid-attempt), the
data-integrity matrix and performance are all covered in `EXAM-ENGINE-AUDIT.md`.

## Launch blockers (ranked)

**Needs engineering, before any real students:**

1. **Real-device testing on iOS Safari and Android Chrome.** This covers autosave, keepalive on tab close,
   BroadcastChannel, localStorage in private mode, the timer across lock and unlock, and highlight selection on
   touch. Everything here ran in Chromium; WebKit wasn't available.
2. **Load test on Supabase.** For example, 50–100 simulated students autosaving at once through the pooler, plus
   a check of connection limits and of row-lock contention on submit.
3. **Deploy configuration checks** (`SECURITY-AUDIT.md`):
   - Vercel Preview deployments must not use the production database. `vercel-build` also runs migrations on
     previews.
   - Supabase storage policies.
   - Deployment Protection on previews.
4. **Run the migration on Supabase** (`20261029132749_question_versions`) as part of the deploy. Existing
   attempts keep working unpinned.
5. **Set `CRON_SECRET`** in Vercel Production, following the steps in `PRIVACY-REVIEW.md` §5. Then run the job
   once and confirm the counts.

**Needs the founder:**

6. **Full-length exams.** The engine is measured at full-length scale (59 questions, 95 minutes, one
   3,000-word passage). Shabari's own passages and questions need importing (`docs/CONTENT_FORMAT.md`). No bank
   was generated.
7. **Approve or change the provisional 90-day contact-message retention.** It stays report-only until
   `INQUIRY_PURGE=on`.
8. **Approve the AI-drafted dopamine lesson** in `/admin/lessons` before it can show to students. It is
   published only in the throwaway test database.

**Known limits, acceptable for launch (documented with reproduction steps in the audit):**

- Highlights are last-write-wins across tabs.
- Two devices don't mirror live until a reload.
- `changedAt` is client-estimated during the 15-minute late window.
- The display can read high after sleep until the next sync (≤ ~15 s; the server enforces the deadline).
- Timed sets don't pause, by design.

## How to reproduce

```bash
cd ~/projects/study-with-shabari-redesign
npx eslint && npx tsc --noEmit
npx vitest run                                   # needs local Postgres: npm run db:local -- start
npx playwright test                              # builds, resets sws_e2e, seeds, runs everything
npx playwright test e2e/practice-journey.spec.ts # the 8-step guest journey only
npx playwright test e2e/performance.spec.ts      # numbers → ~/projects/study-with-shabari/.local/shots/m2/perf.json
```
