# Product direction: from a beautiful site to the best MCAT learning experience (2026-10-29)

Source: founder (Nishanth). Judge everything by one journey:
**a new visitor arrives → sees why Shabari is credible → learns something real → completes a free practice
set → understands their mistakes → books a consultation, with no confusion.**

Work in this order. Finish and verify each milestone (screenshots + tests) before the next.
Do not restart the codebase. Do not touch production data, DNS, deploys or spending.

## M0 — Finish CD Review 1 (in progress)
The 12 items in `CREATIVE-DIRECTION.md`. Palette must read refined, not neon: check eosin/teal saturation in the 3D lighting.

## M1 — Interactive sample lesson on the homepage (the next big milestone)
- Each story chapter ends in **one original MCAT-style question** about dopamine, answered inline:
  A Chem/Phys (e.g. charge state of the amine at pH 7.4 given its pKa), B Bio/Biochem (the rate-limiting
  enzyme / effect of a cofactor deficiency), C Psych/Soc (reinforcement/reward-prediction scenario).
- Then **one passage-based question** (short original passage) with the full review experience.
- Picking an answer reveals: correct/incorrect, why the right answer is right, and why each distractor is wrong
  (`Choice.rationale`). Clicking an atom/pathway step in the 3D/SVG can highlight the part the explanation refers to.
- Questions live in the **content system** (Question/Choice, section, topics, difficulty), not hard-coded, so
  admin can edit them. Add a `lesson` exam/collection.
- **Attribution rule:** these explanations are written by Claude, not Shabari. The homepage lesson shows only
  PUBLISHED items. Until Shabari approves them, local/preview renders them with a visible "Draft — pending
  Shabari's review" badge, and production hides the lesson. Never label AI-written text "Shabari's explanation".
- Works with no JS animation, keyboard-only, and screen readers (radio group, live region for the result).
- Ends with two CTAs: "Try a full free practice set" and "Book a free 15-min call".

## M2 — Exam engine audit + review experience
- Audit in a real browser and with E2E: timer (server deadline, pause rules, expiry), autosave and refresh
  (no lost answers), navigation/navigator, passage rendering, highlight, strike-out, flag, review screen,
  submit, scoring, results.
- Review mode: per question, your answer vs correct, explanation, and **every distractor's rationale**, time spent,
  flagged state, filters (incorrect / flagged / slow).
- No scaled scores, no AAMC content. Percent correct only.

## M3 — Learning loop (explainable only)
- After review, the student can tag each miss: content gap / misread the question / calculation / ran out of time /
  narrowed to two. Store it on Response. (Self-tagged, so it's honest data, not inference.)
- Weak topics use the existing Wilson lower bound; show **nothing** until a topic has ≥ 5 answered items, and
  show the count behind every claim ("4 of 11 correct").
- "Revisit mistakes": a practice set generated from the student's own missed questions.
- Recommendations name the data they're based on. No score predictions.

## M4 — Trust and conversion
- Founder section: real photo (done), "What happens in a tutoring session" (from founder-confirmed copy only:
  leave clearly marked TODOs where we don't know), the sample lesson as the proof of teaching, verified
  credentials only from `src/lib/site.ts`.
- Placeholders for a teaching video and testimonials: **build the slots, ship them hidden** until real
  content and consent exist. No invented testimonials, outcomes or endorsements.
- Pricing page fully transparent (what each plan includes, Zelle, no checkout).
- Free practice + booking visible on the first mobile screen on every public page (sticky bottom bar on mobile is fine).
- **Privacy-respecting funnel:** first-party, cookieless, aggregate daily counts in Postgres only
  (lesson_answered, practice_started, practice_completed, booking_scheduled). No user IDs, IPs or third-party
  analytics. Show the funnel on the admin overview.

## M5 — Performance and accessibility (measured, not claimed)
Targets: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (Lighthouse mobile, throttled, on the production build),
WCAG 2.2 AA (axe on every public page and the exam), static fallback when WebGL fails or reduced motion is set,
all science content readable with animation off. Exam UI stays distraction-free: no cinematic styling there.
Note honestly that real-phone testing still needs a person with a phone.

## M6 — QA and launch blockers
Desktop 1440, tablet 820, phone 390 screenshots of every primary journey; full E2E including the exam flow;
fix regressions; finish with `docs/LAUNCH-BLOCKERS.md`, ranked, separating "needs founder" from "needs engineering".

---

## Amendment 1 (founder, 08:06): reusable learning loop + one vertical slice before any new scope

Order is now: **M0 (12 visual fixes) → M1′ (learning loop + dopamine lesson) → vertical-slice proof → privacy review.**
M2–M6 wait until the slice works end to end. No scope expansion before then.

### M1′ — a reusable loop: Teach → Test → Explain → Diagnose → Reinforce → Retest
Dopamine is the first lesson *built on the system*, not hard-coded. Suggested model (adjust to fit the schema):

- `Lesson`: slug, title, section, status (DRAFT/REVIEW/PUBLISHED/ARCHIVED), `objectives[]`, prerequisite Topics.
- `LessonStep` (ordered): `TEACH` (content blocks, may reference the 3D/SVG figure), `TEST` (a Question, usually
  passage-based), `REMEDIATE` (keyed to a Misconception), `RETEST` (a different Question on the **same concept**).
- `Misconception`: topic, short name, description, remediation content. Each wrong `Choice` may point to one
  (`Choice.misconceptionId`) in addition to its `rationale`.
- **Versioning and approval:** publishing snapshots the lesson + its questions into `LessonVersion`
  (immutable JSON, version number, `approvedById`, `approvedAt`). Students always see a published snapshot.
  Edits create a new draft; every change writes `AuditLog`. Only an ADMIN can approve; AI-authored content is
  created with `authoredBy: "ai"` and **cannot be published without a human approval step** (enforce in
  `src/lib/admin/rules.ts` with unit tests).
- `LessonAttempt` (user or hashed guest key): per step, the choice, **self-rated confidence before reveal**
  (sure / unsure / guessing), correctness, misconception hit, time.
- Flow: teach → question → student rates confidence → reveal: right/wrong, why the correct answer is right,
  why *their* choice is wrong (its rationale), the named misconception → targeted remediation → retest on the
  same concept → result.
- **Result screen (meaningful, honest):** objectives covered; first answer vs retest; the misconception named;
  confidence vs correctness ("you were sure and wrong on X", which is the useful kind of feedback); what to do
  next (a practice set on that topic, or book a call). No mastery percentages or predictions from 2 questions.
- **Progress indicators:** step x of n, objectives done; nothing inferred beyond what was answered.
- Admin: lesson editor (objectives, steps, misconception mapping), a review queue, a diff between versions, approve/publish.
- Dopamine lesson content: 3 TEST + 3 RETEST questions (one pair per chapter) + 1 passage question, with
  misconceptions such as "treats the amine as neutral at physiological pH" and "thinks AADC is rate-limiting".
  All authored as AI drafts: **status REVIEW, badge visible in preview, hidden in production** until Shabari approves.

### Vertical-slice proof (required before anything else)
A Playwright spec `e2e/journey-mobile.spec.ts` on iPhone 14 emulation, production build, local DB, that:
1. opens the homepage; 2. checks the credentials are visible (522, MIT, majors) in the first two screens;
3. completes the dopamine lesson; 4. answers one question incorrectly on purpose; 5. asserts the explanation names
the chosen misconception and shows the remediation; 6. answers the retest correctly; 7. asserts the result screen
shows the first-vs-retest comparison; 8. opens booking and sees the Calendly embed (stubbed, as in existing E2E).
To exercise the lesson locally, let the test publish the AI drafts **in the test database only** (fixture), never in Supabase.
Save one screenshot per step to `~/projects/study-with-shabari/.local/shots/journey/01-…08-….png` (main checkout path).
Report pass/fail per step with the test output.
Honest limit: a real booking needs the real Calendly link, which is still a mock.

### Privacy review → `docs/PRIVACY-REVIEW.md`
Audit and fix, with evidence:
- **Server logs:** what Next/route handlers/`console` log; no IPs, emails, tokens, query strings with personal data,
  or request bodies. Note what Vercel itself logs and its retention.
- **IP addresses:** where they're used (rate limiting is HMAC'd), retention of `RateLimitBucket` rows (add cleanup),
  and nothing storing raw IPs.
- **Third-party requests:** list every external host the browser contacts per page (Playwright network log).
  Fonts must be self-hosted (`next/font`); Calendly only on /book; the IONOS chat only when enabled; Sentry off.
  Disclose each in the privacy policy.
- **Aggregate reporting:** funnel counts have no identifiers; suppress daily counts under 5 in any view that could
  be shared; no per-visitor timelines.
- **Data lifecycle:** guest-key data retention, inquiry retention, account export/delete still working,
  and an accurate privacy page.

---

## Amendment 2 (founder, 09:07): implement docs/FOUNDER-SPEC.md in full, now

The founder said "fix all rn". This supersedes the visual direction in CREATIVE-DIRECTION.md and the
"no scope expansion" rule in Amendment 1. **`docs/FOUNDER-SPEC.md` is now the source of truth for every fact
and for the site structure.** Copy facts exactly as written; do not embellish or add any claim it doesn't contain.

### Order
1. **Facts first (small, do immediately):** update `src/lib/site.ts`. Majors are
   "Chemistry & Molecular Biology (Course 5-7) and Neuroscience (Course 9)", MIT Class of 2027, senior, premed.
   Replace "Biochemistry and Computational Neuroscience" everywhere (hero, founder, about, metadata, OG image, tests).
   Move all credentials, research, publications, teaching, honors, high-school record, Mudzi and the bio into typed
   data in `src/lib/founder-facts.ts` with a comment pointing to FOUNDER-SPEC.md.
2. **Visual system per the spec:** white backgrounds, deep navy primary, bright blue buttons and links,
   light blue-grey section backgrounds and borders; modern sans-serif with bold headlines (drop Newsreader on
   public pages); sharp grid; **one** smooth hero animation only; no gradients, no neon. Remove the pinned
   scroll story. The 3D molecule stays only if it is that one hero animation (subtle, in the MCAT panel), otherwise remove it.
   Exam UI unchanged.
3. **Structure per the spec:** nav exactly as listed; home hero (headline, two equal panels with buttons,
   "Book a free 15-min call", credibility strip); MCAT half (sections 1–4); Admissions half (sections 5–10) with
   **equal visual weight and depth**; shared sections 11–17 (Research & Teaching as a timeline page, Mudzi,
   payment note under both pricing sections, About with her bio, booking with an MCAT / College Admissions toggle
   and two Calendly slots, FAQ with all 7 answers, footer).
4. **The dopamine lesson and learning loop (Amendment 1) stay**, presented on the MCAT half as the free
   interactive lesson ("Try a free lesson"), not as decoration. Same AI-content approval rules.
5. **Practice platform:** keep the engine. Full-length C/P, B/B, P/S sections need Shabari's own questions:
   build the full-length exam structure (section timing, question counts and the navigator at full length) and the
   import path, and show "coming soon" for full-lengths until her content is imported. Do not generate a
   full-length bank and present it as hers.
6. **Blanks:** admissions prices are unknown, so show "Priced on your consult call" until the founder gives them.
   Notes Google Doc URLs and the two Calendly URLs: env/admin-configurable, and "coming soon" when unset.
7. Then the mobile journey test (Amendment 1), adapted to the new structure, plus a second journey for an
   admissions visitor: home → admissions half → credentials → admissions pricing → booking with the Admissions toggle.

### Guardrails that still apply
No logos or trademarks of MIT, Ivies, AAMC, Kaplan or Princeton Review. School names as plain text tiles only.
Keep "Not affiliated with MIT/AAMC" disclaimers. No testimonials or outcomes beyond the spec. No deploys, DNS or spending.
