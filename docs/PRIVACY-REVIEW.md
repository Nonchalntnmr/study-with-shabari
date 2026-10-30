# Privacy review (2026-10-29)

Scope: what the site logs, where IP addresses go, which outside hosts each page contacts, how the funnel counts
are kept, and how long each kind of data lives. This follows PRODUCT-DIRECTION.md, Amendment 1. Each section
gives the evidence, what was fixed, and what is still open.

Evidence was taken from the production build (`next build` + `next start`, `scripts/e2e-server.sh`) against the
throwaway `sws_e2e` database. Nothing was deployed and no live service was contacted: Calendly was stubbed at
its real origin.

- Network and cookie log: `e2e/privacy-network.spec.ts`, which writes `.local/privacy/network-report.json`.
- Retention purge: `tests/integration/retention.test.ts`.
- Funnel schema and counts: `tests/integration/lessons.test.ts` ("completes the attempt and counts the funnel
  without identifiers").
- Suppression: `tests/unit/lesson-flow.test.ts` ("suppresses daily counts under five").

## Summary

| Area | Finding | Status |
|---|---|---|
| App logging | No `console.*` calls in `src/`. Sentry is off unless a DSN is set, and then collects no user info, cookies, headers, bodies or query strings. | OK |
| Secrets in URLs | The password-reset token was in `?token=`. Vercel request logs keep search params. | **Fixed**: moved to `#token=` (never sent to the server). Old `?token=` links still work. |
| Raw IPs | Never stored. Used only as an HMAC-SHA256 key (with `AUTH_SECRET`) for rate limiting. | OK |
| User agent | Stored on every session but never read. | **Fixed**: no longer collected. |
| Third parties | One per site: Calendly, only on `/book`. Fonts are self-hosted. No analytics. | OK (measured) |
| Cookies | Reading pages sets none. The guest cookie is set only when a practice set or lesson starts. | OK (measured) |
| Funnel | Table is `(day, event, count)` only. Views show counts under 5 as "<5". | OK; new admin view |
| Expired sessions and reset tokens | Kept forever. | **Fixed**: daily purge |
| Guest history | Kept forever, although the guest cookie that reaches it expires after 180 days. | **Fixed**: purged after 180 days |
| "Clear guest history" | Deleted exam attempts but left lesson attempts behind, orphaned. | **Fixed** |
| Data export | Didn't include lesson attempts. | **Fixed** |
| Contact-message deletion | The privacy page promised it; no admin action existed. | **Fixed**: admin "Delete", which also removes the email records holding the address |
| Inquiry retention period | None defined. | **Needs founder decision** |
| Daily purge in production | Scheduled in `vercel.json`, but needs `CRON_SECRET` in Vercel. | **Needs setup at deploy** |

## 1. Server logs

**Our code.** `grep -rn 'console\.' src --exclude-dir=generated` finds no logging calls. Route handlers and
server actions return errors to the client and log nothing.

**Next.js** prints unhandled server errors to stderr: the message and a digest, with the digest alone on the
error page. Prisma's error messages name constraint fields but not values. The lesson service catches the one
expected error (a duplicate answer, P2002) without logging.

**Sentry** stays off unless `NEXT_PUBLIC_SENTRY_DSN` is set. When it is on, `src/lib/sentry-options.ts` turns off
user info, cookies, HTTP headers, request bodies and URL query parameters.

**Vercel itself.** For each request, Vercel's runtime logs record:

- the request path, search params, user agent and status;
- the IP address, used for its "logs from your browser" filter.

Retention is 1 hour on Hobby, 1 day on Pro, and 30 days with Observability Plus. Source:
<https://vercel.com/docs/logs/runtime>, "Limits" and "Log details". Bodies aren't logged, so contact messages and
answers (server-action POST bodies) stay out. Buying Observability Plus would extend this to 30 days and should
be disclosed if it happens.

**What our URLs contain:**

- `?next=` (a path on this site)
- `?step=N` in lessons
- `?cleared=1` and `?account=deleted`
- random attempt ids in `/exam/<id>` and `/lessons/<slug>/a/<id>`

Attempt ids aren't personal. They do let anyone with Vercel log access group one visitor's requests during the
retention window. That's an accepted, disclosed residual: it's Vercel's operational log, not ours.

**Fixed:** the password-reset email linked to `/reset-password?token=…`. Every request passes through `proxy.ts`,
so Vercel would have logged a live token for up to an hour (its expiry). Links now use `/reset-password#token=…`;
browsers never send the fragment to the server. In M2 the page also reads the token once into memory and then
removes it from the address bar and history (`history.replaceState`). The chat widget stays off reset pages, and
the legacy `?token=` fallback is gone, since no reset email was ever sent. E2E: `e2e/m2-workflows.spec.ts`.

## 2. IP addresses

`clientIpKey()` (`src/lib/security/request.ts`) is the only reader of `x-forwarded-for` or `x-real-ip`. It
returns `HMAC-SHA256(AUTH_SECRET, "ip:" + address)`, which is used only as a `RateLimitBucket` key. The limited
actions are:

- signup, login and password reset
- contact form
- starting a practice set
- starting a lesson
- exam autosave

No table has an IP column.

`RateLimitBucket` rows expire at the end of their window, which is at most an hour. Expired rows are deleted on
2% of rate-limit calls and now also by the daily purge.

An HMAC keyed with a server secret is pseudonymisation, not anonymisation: someone holding `AUTH_SECRET` could
test a guessed address. The rows live for at most about a day.

## 3. Outside hosts, per page (measured)

`e2e/privacy-network.spec.ts` loaded each public page in Chromium, waited for the network to go idle, and
recorded every request to a host other than the site's own. It also recorded the cookies left in the browser.

| Page | Outside hosts contacted | Cookies after visiting |
|---|---|---|
| `/` | none | none |
| `/lessons/dopamine` | none | none |
| `/practice`, `/practice/cp-sample-set-1` | none | none |
| `/resources`, `/mcat-tutoring`, `/admissions`, `/pricing` | none | none |
| `/about`, `/testimonials`, `/faq`, `/contact` | none | none |
| `/book` | `calendly.com` (the booking iframe) | none (first-party) |
| `/privacy`, `/terms`, `/login`, `/signup` | none | none |
| After pressing "Start the lesson" | none | `sws_guest` (HttpOnly, SameSite=Lax; `__Host-sws_guest` on HTTPS) |

**Fonts:** Newsreader, Schibsted Grotesk, Atkinson Hyperlegible and Geist are self-hosted by `next/font`. No
Google Fonts requests were made.

**Calendly** loads only on `/book`. The embed URL carries only `embed_domain` and `embed_type`, with no name or
email prefill. Calendly's own cookies inside its iframe fall under its policy. The stub can't show those, so a
real-link check is still owed (see Open items).

**The IONOS chat** renders only when `NEXT_PUBLIC_IONOS_CHAT_AGENT_ID` is set, and it isn't set here. It stays
hidden on the exam, admin, dashboard, login, signup and account pages. It is now also hidden during a lesson
attempt (`src/components/site/chat-widget.tsx`). When it's switched on, re-run this spec with the agent id set to
list its hosts. The CSP allows `ionos.ai-voicereceptionist.com` only when `NEXT_PUBLIC_IONOS_CHAT_AGENT_ID` is set.

**Sentry** made no requests (no DSN).

## 4. Aggregate reporting

**The schema is the guarantee.** `FunnelDaily` is `(day, event, count)` with primary key `(day, event)`. The
integration test asserts that those are its only three columns. Counts are incremented on the server
(`src/lib/funnel/record.ts`), with no cookie, user id or IP. Counting is best-effort and never breaks the page.

Three events are counted today:

- `lesson_started`
- `lesson_answered`
- `lesson_completed`

Previews of unapproved lessons are never counted. `practice_started`, `practice_completed` and
`booking_scheduled` are defined but not wired yet (M4).

**Suppression.** `suppressSmall()` (`src/lib/funnel/events.ts`) turns any daily count under 5 into `null`. The
only view, "Funnel, last 14 days" on the admin overview, shows those as "<5". There are no per-visitor timelines:
the data model has nothing to build one from.

**Residual.** The raw table still holds small numbers. Only database administrators can read it: RLS blocks
Supabase's public Data API on every table, as `tests/integration/rls.test.ts` checks.

## 5. Data lifecycle

The daily purge is `purgeExpired()` in `src/lib/privacy/retention.ts`, run by the cron route
`/api/cron/retention`.

| Data | Kept until | How |
|---|---|---|
| Account, practice and lesson data | The student deletes the account | `deleteAccount` cascades through sessions, attempts, responses, saved items and lesson attempts. E2E: "students can download and delete their data". |
| Data export | n/a | `/api/account/export` now includes lesson attempts and answers (step, choice, confidence, correctness, misconception, time). |
| Sessions | Expiry (30 days) | **New:** deleted by the daily purge |
| Password reset tokens | 1 day after expiry or use (they expire after 1 hour) | **New:** daily purge |
| Rate-limit buckets | End of window (≤ 1 h) | Opportunistic plus daily purge |
| Guest practice and lesson history | 180 days after it starts, when the guest cookie expires | **New:** daily purge |
| Guest-cleared history | Immediately | "Clear guest practice and lesson history" now deletes lesson attempts too |
| Contact messages and their email records | Until an admin deletes them, for now. **Provisional policy (M2), pending the owner's approval:** resolved and spam messages 90 days after their last change. | Admin "Delete" on `/admin/inquiries`; the audit entry records only the inquiry kind (E2E `e2e/contact.spec.ts`). `purgeInquiries` implements the provisional policy, `INQUIRY_RETENTION_DAYS` (default 90) and **report-only until `INQUIRY_PURGE=on`**: the daily job returns how many messages it would delete, and deletes nothing. Open messages (new or in progress) are never deleted; ones past the period are counted. |
| Abandoned timed attempts | Scored and closed once past the deadline and the 15-minute late-delivery window | **New (M2):** `closeExpiredAttempts` in the daily job. |
| Audit log | Indefinitely (append-only) | Holds actor ids and admin emails. Self-deletion logs the deleted account's opaque id and role only. |

**The purge in production.** `vercel.json` schedules `/api/cron/retention` daily at 09:00 UTC. The route answers
`401` unless the request carries `Authorization: Bearer $CRON_SECRET`, compared in constant time. It is **not set
yet**, because no deploy or Vercel config changes were made. Until it is, the purge doesn't run in production.

**`CRON_SECRET` setup** (owner or engineer, at deploy; no value is stored in the repo):

1. Generate a long random value on your own machine, for example `openssl rand -base64 48`. Don't paste it into
   chat, tickets or commits.
2. Vercel → Project → Settings → Environment Variables. Add `CRON_SECRET` for **Production** only. Vercel Cron
   then sends it as `Authorization: Bearer …` automatically.
3. Redeploy, so the function picks it up.
4. Check: Vercel → Project → Cron Jobs → `/api/cron/retention` → "Run". The response lists the counts:
   - `sessions`, `resetTokens`, `rateLimitBuckets`, `guestAttempts`, `guestLessonAttempts`
   - `closedAttempts`
   - `inquiries.eligible`, `inquiries.deleted`
   `inquiries.deleted` stays 0 while `INQUIRY_PURGE` is unset.
5. Only after the owner approves the contact-message period: set `INQUIRY_RETENTION_DAYS` (if not 90) and
   `INQUIRY_PURGE=on`. Then update the privacy page's "How long it's kept" to state the period.

## 6. The privacy page

`/privacy` was updated to match the code. It now:

- describes the lesson data (answer, confidence, correctness, misconception matched, time);
- says that reading pages sets no cookie;
- explains the anonymous daily tallies and the under-5 suppression;
- explains Vercel's request logs and their 1-hour-to-1-day retention;
- says that fonts are served from the site and that Calendly loads only on the booking page;
- gives specific retention periods for sessions, reset links and guest history;
- says that clearing guest history covers lessons.

## Open items

**Needs founder:**

1. Approve or change the **provisional 90-day** contact-message period. It's implemented and runs report-only
   until `INQUIRY_PURGE=on`, so existing messages are never deleted silently. The privacy page stays accurate
   ("kept while they're useful") until the policy is switched on and the page updated.
2. Before switching on the IONOS chat, confirm what IONOS stores from conversations. The policy already defers to
   IONOS's terms.

**Needs engineering at deploy:**

3. Set `CRON_SECRET` in Vercel (any long random string) so the daily purge runs. Check with one authorised call
   to `/api/cron/retention` and look at the counts it returns.
4. With the real Calendly link, re-run `e2e/privacy-network.spec.ts` without the stub. Note the hosts Calendly's
   iframe loads on `/book`.
5. If the chat is enabled, re-run the spec with `NEXT_PUBLIC_IONOS_CHAT_AGENT_ID` set and add its hosts here.
6. Keep the Vercel plan's log retention in line with the policy: Hobby or Pro is 1 hour to 1 day. Observability
   Plus (30 days) would need a policy change.
