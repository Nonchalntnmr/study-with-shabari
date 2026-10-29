# Exam engine audit (M2, 2026-10-29)

**Scope:** the practice exam engine: lifecycle, interactions, timing, results, data integrity, the publishing
system and performance.

**Branch and environment:** branch `redesign/cinematic`. Every result below comes from the production build
(`next build` + `next start` via `scripts/e2e-server.sh`) against the throwaway `sws_e2e` database, plus vitest
against `sws_test`. Nothing ran against Supabase. The test runner was Chromium (WebKit isn't installed on this
machine).

**Commits:**

- `f7ac83d` security fixes
- `0d53bb5` exam engine
- `9b5af99` retention
- this commit: docs, the performance spec and screenshots

## How it works now

| Concern | Design |
|---|---|
| **Content history** | Each attempt is pinned at start to `QuestionVersion` rows. These are immutable snapshots of the stem, passage, choices with the answer key and rationales, the explanation and the topics, keyed by content hash. The runner, autosave validation, grading and review all read the pinned copy, so editing a published question creates a new version and never touches an attempt in progress or a past result. Attempts from before this change read live content, as they always did. |
| **Autosave** | A dirty-tracked, debounced (600 ms) `POST /api/attempts/:id/sync` is serialized per attempt by a row lock. Every answer carries `changedAt`, the browser's estimate of server time when the student made it, clamped by the server to between the attempt start and the request's arrival. The newest change wins; time on a question only grows. |
| **On-device copy** | A localStorage backup keyed by attempt. It merges per question across tabs, newest change wins, and a tab removes only what it saved. On reload, the backup restores only entries at least as new as the server's copy. |
| **Tabs** | A BroadcastChannel per attempt mirrors answers and highlights between tabs, and sends every tab to results on submit. |
| **Submit** | Carries every unsaved change and applies them together with scoring in one locked transaction. It is idempotent. The device copy is cleared only after the server confirms. |
| **Clock** | The deadline is fixed at start (timed mode). The display uses server time from the last sync plus `performance.now()`, re-anchored on every sync and whenever the tab becomes visible, so the device clock is never read. A timeout submit is honored only if the server's own deadline has passed; otherwise the server returns the real deadline and the clock re-anchors. |
| **Late delivery** | For 15 minutes after the deadline, answers stamped before the deadline (stuck offline, for example) are still accepted, and the attempt is scored as of the deadline. Changes stamped after the deadline are refused. Reopening the page inside that window hands over the device copy, then submits. |
| **Signed out** | An account's attempt synced without a session gets `401`. The runner keeps the answers on the device and shows "Sign in to keep saving", which returns to the attempt. `404` (no access) and `400` (bad data) have their own messages and also keep the device copy. |
| **Abandoned attempts** | The daily cron scores and closes timed attempts that passed their deadline and the late window. Opening one does the same. |
| **Pausing** | Not offered. Timed sets run on the server's clock like test day, and untimed sets have no clock. The start page says a timed set submits itself when time runs out. |
| **Retest** | "Retest the N you missed" on results starts an untimed attempt of the missed or unanswered questions, on their current versions, linked both ways. The original's results list its retests. |
| **Review** | Per question: your answer vs. the correct one, a rationale for every choice, the explanation, time spent, the flag, topics, and the misconception name when the wrong choice maps to one. Filters: all, missed, flagged. Percent correct only, with "not an MCAT scaled score" shown on every result. |

## Bugs found and fixed

| # | Severity | Bug | Fix |
|---|---|---|---|
| 1 | High | **Edits to published questions rewrote history.** Grading and review read live rows, so changing a stem or the answer key changed past review pages, and graded in-progress attempts against content the student never saw. It also let a parked attempt reveal draft text rewritten after an exam was unpublished (security finding 3). | Version pinning (above). Regression tests: "pins each attempt…" and "a parked attempt never shows draft content…". |
| 2 | High | **Submit could drop the last answers.** If the final autosave failed with a 5xx and the submit then succeeded, the answers were never saved, and the device backup was cleared on the way to results. | Submit carries the unsaved payload in the same transaction; the backup is cleared only on confirmation. |
| 3 | High | **A device clock jump could end a timed attempt early.** The clock compared the deadline against `Date.now()` and called a normal submit at zero, which the server accepted as manual. | Monotonic clock plus server-checked timeout submits. E2E: a +3 h `Date.now` jump leaves the attempt open, and a forged timeout submit gets `not_expired`. |
| 4 | Medium | **Stale backups and tabs overwrote newer answers.** One tab's successful save wiped the other tab's unsynced backup, and a restored backup always overwrote the server. | `changedAt` newest-wins on the server, a per-question merged backup, a restore rule, and BroadcastChannel. |
| 5 | Medium | **Signed out mid-exam showed a dead end** ("Couldn't save. Reload the page.") and treated it like a missing attempt. | Separate `401`, a sign-in link back to the attempt, and the answers kept and resent after sign-in. |
| 6 | Medium | **Answers stuck offline in the last minutes were lost** once the 5-second grace ended. | The 15-minute late-delivery window for changes stamped before the deadline. |
| 7 | Low | Expired attempts stayed `IN_PROGRESS` until someone opened them. | The daily cron closes them. |
| 8 | Low | After a refresh during submit, the device copy lingered for a submitted attempt. | The results page clears it. |
| 9 | Low | Publishing allowed choices without a rationale, or a question without a topic (status control path). | Publish rules now require both. AI-drafted questions need an admin's approval, with an attestation, first. |

## Verified working (tests in this branch)

### Unit and integration tests

`npx vitest run` gives **25 files, 161 tests, all passed**.

New integration tests (`tests/integration/exam-integrity.test.ts`):

- version pinning across an edit, including an answer-key change
- version dedupe
- the parked-draft regression
- legacy attempts
- newest change wins
- rapid changes
- future-stamped changes
- atomic submit
- duplicate submit with a different payload
- timeout before the deadline
- late delivery inside and outside the window
- signed out vs. not found
- the cron closing abandoned attempts
- retest and its history
- misconception names
- contact-message retention

New unit tests (`tests/unit/exam-integrity.test.ts`): backup merge, prune and restore; the monotonic clock;
`changedAt` bounds; the late window; hashing; changed-field diffs.

### Browser tests

`npx playwright test` gives **60 passed, 1 skipped by design** (the mobile-only spec under the desktop
project), exit 0, from a clean build and a fresh database.
Final run: `.local/m2-e2e.log`. New specs:

**`e2e/practice-journey.spec.ts`** (the brief's guest journey, every step passed):

1. Start a free set.
2. Answer, flag and refresh.
3. Exact restore: answers, flag and position.
4. Complete the set.
5. Accurate score and explanations, with four rationales per question.
6. Review the misses (filter).
7. Retest the two misses: 2/2, with links and history both ways.
8. Booking.

It also covers a registered student whose attempts and retest are kept on the account.

**`e2e/exam-integrity.spec.ts`:**

- rapid changes
- two tabs, live mirroring and newest wins
- offline, then online
- 5xx, retried and nothing dropped
- refresh during autosave
- refresh during submit
- duplicate submits
- a device clock jump
- session expiry, then sign-in to resume
- guest to account
- an admin editing a question mid-attempt (the student keeps their version)

**`e2e/m2-workflows.spec.ts`:**

- an AI-drafted question can't publish until it is approved; the version records the reviewer
- password reset end to end
- the open-redirect regression

**`e2e/performance.spec.ts`:** the measurements below.

The existing exam spec (timer, strike-out, highlight, flag, navigator, review screen, keyboard and offline)
still passes, as do the iPhone 14 lesson journey and the 13 axe scans, including the exam runner and results.

## Expected behavior per failure mode

| Failure | Expected and verified |
|---|---|
| Rapid answer changes | The last change is saved (E2E and integration). |
| Two tabs | Both show the latest answer; the newest change wins on the server (E2E). |
| Network drop | "Offline, retrying. Your answers are kept on this device." It saves on reconnect (E2E). |
| Server write fails (5xx or 429) | Exponential backoff retries; nothing is dropped (E2E). |
| Refresh during autosave | The answer is restored from the device copy and resent (E2E). |
| Refresh during submit | Either submitted with the last answer, or reopened with it (E2E covers both branches). |
| Duplicate submit or concurrent requests | Scored exactly once; the first result stands (E2E and integration). |
| Session expired | 401: answers are kept on the device, and the sign-in link resumes the attempt (E2E). |
| Guest signs up mid-set | The attempt is claimed by the account and keeps saving (E2E). |
| Device clock wrong or changed | No effect on time; the server's deadline rules (E2E). |
| Offline at the deadline | Answers made in time are delivered for up to 15 minutes (integration). |
| Bad data (unknown choice, foreign question) | 400. The change is kept on the device and the student is told to reload (integration). |

## Performance (measured)

From `e2e/performance.spec.ts`, raw numbers in `~/projects/study-with-shabari/.local/shots/m2/perf.json`. The
set is generated to full-length scale: 59 questions, 95 minutes, six passages, one of them 3,000 words. It ran on
the local production build in Chromium. These are lab numbers on one machine, not field data.

| Scenario | Result |
|---|---|
| Start → first question (cold server) | 869 ms |
| Reload the runner directly → first question | 355 ms |
| Runner document for the whole set | 17.4 KB transferred, 179 KB decoded; DOMContentLoaded at 42 ms |
| Next question (desktop), median / max of 15 | 33 / 39 ms |
| Highlight nearly the whole 3,000-word passage | 218 ms |
| Answer → "Saved" (includes the 600 ms debounce) | 812 ms |
| iPhone 14 viewport, 4× CPU throttling: start → first question | 213 ms (warm server) |
| iPhone 14, 4× CPU: next question, median / max | 49 / 60 ms; no horizontal overflow |
| Slow network (400 ms RTT, 400 kbps): start → first question | 1.85 s |
| Slow network: answer → saved | 1.31 s |
| Slow server (autosave held 3 s): next input reflected / next question | 33 ms / 68 ms; the later answer is the one saved |
| WebGL disabled and reduced motion | Homepage renders the static poster (0 canvases), the 522 bars are drawn at once, and the exam works with no page errors |
| Homepage 3D and poster assets blocked (6 homepage-only scripts) | The exam starts, saves and submits with no page errors |

**Not measured:**

- Real database latency (Supabase pooler) and many concurrent students. There's no load-test tooling here, and
  the delayed-autosave test emulates a slow server at the HTTP layer, not the database.
- Lighthouse and Core Web Vitals on a real phone.

## Remaining risks and limits

1. **Highlights are last-write-wins across tabs.** They carry no server-side change time, so a stale tab that
   highlights later replaces another tab's highlights for that passage. Answers are not affected.
   To reproduce, highlight in tab 1, then add a different highlight in tab 2 while tab 2 is offline and ignoring
   broadcasts.
2. **Two devices (not two tabs) don't mirror live.** The server keeps the newest answer, but the other device
   shows its own state until it reloads.
3. **`changedAt` is the browser's estimate.** A modified client could stamp answers as made before the deadline
   during the 15-minute window. This is free practice, so the only person helped is the cheater. Documented, and
   accepted.
4. **Sleep with the page visible.** If the OS suspends `performance.now()` and no `visibilitychange` fires, the
   displayed time can read high after waking, until the next sync (at most about 15 s, through time tracking).
   The server enforces the real deadline regardless.
5. **WebKit / iOS Safari not tested** (not installed). BroadcastChannel, keepalive and localStorage behave
   differently there. This needs a real iPhone.
6. **No load test.** Each attempt is serialized by a row lock, which is correct but untested at class scale on
   Supabase's pooler.
7. **No full-length exams yet.** The engine handles full-length scale (measured above), but Shabari's own
   full-length content must be imported. None was generated.
8. **Admin edits to passages** create new question versions only when a question that uses the passage is next
   published, edited or served. History is still safe, because every attempt pins at start.

## Commands

```bash
npx eslint && npx tsc --noEmit
npx vitest run                     # unit + integration (sws_test)
npx playwright test                # production build + sws_e2e (scripts/e2e-server.sh)
npx playwright test e2e/performance.spec.ts   # numbers → .local/shots/m2/perf.json
```

## Screenshots

In `~/projects/study-with-shabari/.local/shots/m2/`:

- `journey/01…08-*.png`: the guest journey, one per step, plus `journey/report.json`
- `signed-out-mid-exam.png`
- `retest-history.png`
- `admin-version-history.png`
