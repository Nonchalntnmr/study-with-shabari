# FL1 import and the founder update: engineering status

Status as of 2026-10-30. The CD's notes are in docs/FOUNDER-UPDATE-NOTES.md (kept untracked).

- **FL1:** converted with `scripts/convert-fl.ts` to `content/exams/fl1.json`, and imported as REVIEW.
  - Choices are shuffled per question id. Answer letters before and after:

    | Section | Before (A/B/C/D) | After (A/B/C/D) |
    |---|---|---|
    | C/P | 6/30/17/6 | 13/11/20/15 |
    | B/B | 4/43/10/2 | 10/16/21/12 |
    | P/S | 17/37/5/0 | 13/13/15/18 |

  - figure_description becomes the passage's caption box (`Passage.figureText`, an additive migration).
  - **Difficulty skew, for Shabari:** 114 easy, 59 medium, 4 hard across the 177. It isn't changed here.
- **samples.json:** not received (C/P came three times). The site's samples are still the AI-drafted sets in
  REVIEW. Please send samples.json.
- **Engine:** the unanswered-question warning already existed. Results now also show a breakdown by difficulty next
  to the one by topic.
- **Paid bank:** planned in docs/QUESTION-BANK-PLAN.md, not built.
- **Chat:** docs/ionos-chat-knowledge.md is rewritten with the score rule. **It has to be uploaded in AI Frontdesk
  by the account owner**; engineering has no access to it.

## Shabari's review (2026-10-30 05:56)

She reviewed all 177 questions, keys and explanations ("all good"), relayed by Nishanth.
- The question files say `reviewed: true`, and `content/exams/fl1.json` was regenerated, so `underReview` is false.
  Choice order and answer letters are unchanged.
- **Production keeps its own flag until someone records the review there.** An admin account runs this, dry run
  first:
  ```
  DATABASE_URL=… DATABASE_SSL_CA="$(cat certs/supabase-root-2021.pem)" \
    npx tsx scripts/mark-exams-reviewed.ts --actor <admin email> fl1-cp fl1-bb fl1-ps          # dry run
  … same command with --apply                                                                 # write
  ```
  It clears `underReview` on the three sets and stamps `reviewedAt`/`reviewedById` on their questions, with one
  `exam.review` AuditLog row per set. Status, content, versions, attempts and responses are untouched, and the cached
  pages refresh within minutes.
- FL1 is still not an official, calibrated or representative MCAT. Results stay percent correct, and
  `e2e/practice-review.spec.ts` fails if a practice page says otherwise.
