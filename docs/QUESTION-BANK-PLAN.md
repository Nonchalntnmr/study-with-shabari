# Paid question bank with access codes: plan only (not built)

Status (2026-10-30): **planned, not built.** The founder update (section 4) asks for a bank for paying students:
practice by section, topic and difficulty, in tutor or timed mode, unlocked with an access code sent after Zelle
payment. The CD's notes (docs/FOUNDER-UPDATE-NOTES.md, item 5) say to build it only after FL1 is live and the
founder confirms. The 2,000-question bank file hasn't arrived yet.

## What already exists and is reused

- **Questions:** in the content system (Question, Passage, Topic, difficulty 1–5), imported with
  `scripts/convert-fl.ts` and `npm run content:import`. Choices are shuffled per question id.
- **The exam engine:**
  - timed practice;
  - server-side autosave that survives a refresh;
  - flag-for-review, the navigator, and the unanswered warning;
  - results by topic and difficulty, review with explanations, and retests of missed questions;
  - question versions pinned per attempt.
- **Accounts and the student dashboard** (`requireUser`). Only reviewed (PUBLISHED) questions are ever served.

## What the bank adds

1. **Access codes.** A new `AccessCode` table holds:
   - a hash of the code (never the code itself);
   - a label (for example "Full MCAT Package, J. Doe");
   - what it unlocks (all sections, or a list of sections);
   - an optional expiry;
   - `createdById`, `redeemedById` and `redeemedAt`, and a revoked flag.

   Codes are 12+ random characters from a no-lookalike alphabet. Each is shown to the admin once at creation. Shabari
   emails it to the student after the Zelle payment, from her own mailbox. The site never takes payment.
2. **Redemption.** The student must be signed in: a guest can't hold paid access. At
   `/dashboard/bank/redeem` they enter the code. A server action looks it up by hash, rate-limits by user and IP,
   binds it to the account, and grants an `Entitlement` (user, scope, from, until).
3. **Practice builder.** `/dashboard/bank` lets the student choose a section, topics and a difficulty band, a
   question count, and a mode:
   - **Tutor:** the explanation shows after each answer.
   - **Timed:** the explanation shows at the end. Timing follows the MCAT's per-question pace.

   The server builds the set from PUBLISHED bank questions in that scope and creates an attempt through the existing
   engine. The answer key is never sent before submission.
4. **Admin.** `/admin/access-codes` lists, creates and revokes codes, and shows redemptions. Every action calls
   `requireAdmin()`, and the authorization test's list is extended.
5. **Analytics.** A student's own history by topic and difficulty, across bank attempts, on their dashboard.
   Aggregate funnel counts only; daily counts under 5 are suppressed, as now.

## Security and privacy

- Codes are stored hashed and compared in constant time. Redemption is rate-limited, and a code works once unless
  it's issued for a group. Revoking a code ends its entitlement.
- Bank questions are served only through attempts, never as a public list. The answer-key leak tests extend to
  bank attempts.
- **Privacy page additions:**
  - that access codes and entitlements are stored with the account;
  - how long they're kept: while the account exists, and deleted with it.

## Open questions for the founder

- Does one code cover all sections, or does Section Focus get a one-section code? Is there an expiry, such as the
  test date plus a month?
- Are group-session students given codes?
- Who sends the codes? Email from the site needs the IONOS mailbox, which isn't set up yet.

## Rough size

About 2–3 days of engineering with tests:
- schema and migration (additive);
- the redeem flow;
- the builder;
- admin;
- tests;
- the privacy update.

Start when FL1 is published and the bank file is in.
