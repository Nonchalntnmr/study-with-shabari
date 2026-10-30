# Security audit (M2, 2026-10-29)

**Method:**

1. An independent, read-only reviewer (a separate agent that traced code paths without changing anything)
   reviewed the app.
2. Each of its findings was verified against the code, then fixed with a regression test or documented. This
   document records the result.

**Testing:** all against non-production data only: `sws_test`, `sws_e2e` and the local production build.
Supabase was not touched.

**Fix commits:** `f7ac83d` (security), `0d53bb5` (version pinning, which closes finding 3), `9b5af99`.

## Findings

| # | Sev. | Finding (verified) | Status and evidence |
|---|---|---|---|
| 1 | Medium | **Open redirect after sign-in.** `safeNextPath` accepted `/\t/evil.example/x`. Browsers and the URL parser strip TAB/CR/LF and read `\` as `/`, so it became `//evil.example`. Confirmed: the old function returned the string unchanged. | **Fixed.** Control characters and backslashes are rejected, and the parsed URL must keep this origin. Unit cases: TAB, CR/LF, LF, `\`, NUL, `///`, `javascript:`. E2E: signing in with that `next` lands on `/dashboard`. |
| 2 | Medium | **Reset token exposure.** The IONOS chat widget, when enabled, could load on `/reset-password` while `#token=` was in `location.hash`. The token was never removed from the URL or history, and Sentry's browser reports include `location.href`. | **Fixed.** The token is read once into memory, then `history.replaceState` removes it. The chat is off `/reset-password` and `/forgot-password`. The legacy `?token=` fallback is gone: no reset email was ever sent, because mail isn't configured. E2E: the hash is empty after load, the token isn't in the URL, a reuse is refused, and other sessions are signed out. |
| 3 | Medium | **Parked attempts exposed draft content.** The runner and results fetched questions by id with no status filter. Unpublish the exam, set its questions to draft and rewrite them, and an open attempt would show the new draft stems, answer key and rationales. | **Fixed by version pinning.** Attempts render only the content captured when they started. Regression: "a parked attempt never shows draft content written after it started". |
| 4 | Low–Med | **`resetPassword` was unthrottled** and ran scrypt (about 32 MB and 100 ms) before checking the token. | **Fixed.** 20 attempts per hour per network. The token is looked up first, and only a valid, unused token reaches the hash. |
| 5 | Low | **The homepage practice preview** imports `content/samples/sample-bank.json` directly and sends one sample question's answer key and rationales to the browser, ignoring its database status. | **Documented, not changed here.** It is the public, published sample shown as a "try it" demo, and revealing after the answer is its purpose. It would keep showing that question if it were later unpublished. The homepage is being redesigned on `redesign/concept-b`, where the preview should read a published exam and grade on the server. |
| 6 | Low | **Lesson admin actions trusted a client `lessonId`** (`updateMisconception`, `mapChoiceMisconception`) for review status and the audit entry. | **Fixed.** Affected lessons are found in the database, from steps whose questions use that choice or misconception. The form field is gone. |
| 7 | Low | **Lesson publish race.** The draft was validated outside the transaction, and a fresh snapshot was stored inside it. | **Fixed.** The lesson row is locked, and one snapshot is built, validated and stored inside the transaction. |
| 8 | Low | **`changePassword` and `deleteAccount`** verified the current password with no rate limit. `changePassword` left outstanding reset tokens valid. | **Fixed.** 10 tries per 15 minutes per account. A password change deletes the account's reset tokens. |
| 9 | Low | **Rate-limit side effects.** Anyone can lock a known email out of login for 15 minutes (10 tries per email). Per-IP buckets are shared behind campus NAT, so a class's autosave could hit 429 near a deadline. | **Partly fixed.** Autosave is limited per attempt (1,200 per 10 min) plus a high per-network ceiling (20,000 per 10 min). The client already retries 429s and keeps answers on the device. **Accepted:** the per-email login lockout is the standard trade-off against password guessing; it lasts at most 15 minutes. |
| 10 | Low | **Account enumeration.** Sign-up says the email already exists, and the reset request sent SMTP inline, so response time revealed whether an account existed. | **Fixed:** the reset email (and its token) are created after the response (`after()`), so timing is the same either way. **Accepted:** the sign-up message, the usual UX trade-off for a small tutoring site. |
| a | Plausible | **Previews.** `previewAllowed` showed unapproved AI lessons on any `VERCEL_ENV=preview` deployment. If previews share the production database and Deployment Protection is off, drafts would be public at branch URLs. | **Fixed in code:** previews now need an explicit `LESSON_PREVIEW=on`; Vercel previews don't get it automatically. **Launch check:** confirm whether Preview deployments use the production `DATABASE_URL`. Note that `vercel-build` runs `prisma migrate deploy` on preview builds too, which would run branch migrations against production. |
| c | Plausible | **The chat widget survives client-side navigation.** `next/script` doesn't unload, so it could stay on `/exam/*` after the start redirect, or on `/login` reached from a public page. | **Mitigated.** On a hidden route, if the widget was loaded in this page session, the page reloads, so the hidden page is a fresh load without it. **Not browser-tested:** the vendor script can't load offline, and the widget is disabled in every environment so far. Test once `NEXT_PUBLIC_IONOS_CHAT_AGENT_ID` is set. |
| d | Plausible | **Draft figures are fetchable by URL** (Supabase public bucket, or `/api/assets/[id]`), because the keys are random. | **Documented.** Uploaded figures are public by design: they appear in published passages and questions. Keys are unguessable, but a figure attached only to a draft is readable by anyone who has its URL. **Launch check (Supabase, read-only):** in the SQL editor, `select * from pg_policies where schemaname = 'storage';` should show no `anon` SELECT or list policy on `storage.objects` beyond public read of the bucket's own objects. Listing must be off. |

## Checked and sound (reviewer and verification)

- **Sessions:** 256-bit random tokens, stored as a sha256 hash. `__Host-` cookies (HttpOnly, Secure, SameSite=Lax)
  over HTTPS, server-side expiry, and the role re-read on every request.
- **Admin authorization:** every admin server action calls `requireAdmin()` first. Non-admins get 404s on admin
  pages (E2E "non-admins can't reach admin pages or data").
- **Attempt ownership:** `ownsAttempt` gates load, sync, submit, results and retest. New: a signed-out request is
  told to sign in (401), never shown data.
- **No answer key before submit:** the runner payload carries no `isCorrect`, rationale, explanation or
  misconception (integration test). Lesson answers are graded on the server against the approved snapshot; the
  answer form gets labels and text only.
- **Unpublished content:** `public-data.ts` returns PUBLISHED rows only. Unapproved lessons render only for
  admins, in development, or with `LESSON_PREVIEW=on` (unit tests). Parked attempts render pinned content (finding
  3). Guests can't start unpublished exams.
- **CSRF:** server actions have Next's origin check. Route handlers that change state (`sync`, `submit`) check
  `isSameOrigin`. The cron route requires `Authorization: Bearer $CRON_SECRET`, compared in constant time.
- **Input validation:** zod with bounds on every action and route (array lengths, string lengths, enums). Images
  are verified by magic bytes. Imports are validated before any write.
- **Database:** RLS is on for every table, including `QuestionVersion` (integration test "is enabled on every
  table"), so Supabase's Data API roles see nothing.
- **Headers:** a CSP built per deployment (`src/lib/csp.ts`), plus HSTS on HTTPS, `frame-ancestors 'none'`,
  `nosniff` and a referrer policy (E2E "security headers"). It is an allow-list CSP, not a strict
  (nonce- or hash-based) one: `script-src` still has `'unsafe-inline'`, see "Content-Security-Policy" below.
- **Errors:** production error pages show a digest only. The app has no `console` logging (see
  `PRIVACY-REVIEW.md`).

## Content-Security-Policy (2026-10-30)

What the policy allows, from `src/lib/csp.ts`:

- **Third parties only when configured.** The IONOS chat hosts (script, connect, frame) only when
  `NEXT_PUBLIC_IONOS_CHAT_AGENT_ID` is set. Sentry only when `NEXT_PUBLIC_SENTRY_DSN` is set, and then only the
  DSN's own ingest host. Supabase Storage images only from the `SUPABASE_URL` project host. `frame-src` is
  `https://calendly.com` alone (www links are rewritten to it by `safeCalendlyUrl`). next.config.ts is evaluated at
  build time, so changing one of these variables needs a redeploy.
- **`script-src-attr 'none'`** blocks inline event-handler attributes. The rendered HTML has none, and the only
  `setAttribute("on…")` in the client bundles is React's feature test, which modern browsers never reach.
- **Checked:** E2E `csp.spec.ts` records every `securitypolicyviolation` in our document on `/`, `/mcat`, `/login`,
  `/book` (both tabs) and three admin pages, and expects none. A live check framed
  `https://calendly.com/shabarishankar` under the production policy and opened an event type: no violations in our
  document. Its nested reCAPTCHA and Stripe frames fall under Calendly's own CSP, not ours.

**Why `script-src` keeps `'unsafe-inline'` (no nonce).** A nonce-based `script-src` was tried for the
request-time routes (`/admin`, `/dashboard`, `/exam`, `/login`, `/signup`, `/reset-password`) on a production
build:

- Next.js applies a nonce only to what it renders for the request. Every route here is partially prerendered
  (Cache Components): the static shell, including the root layout, is built ahead of time, so it is served without
  one.
- On `/login`, `/admin`, `/admin/lessons`, `/admin/users` and `/dashboard`, 17 to 19 of the 24 to 32 `<script>`
  tags had no nonce. Among them are two inline bootstrap scripts: the Turbopack runtime (`<script id="_R_">`) and
  React's `$RT` timing script.
- With `script-src 'self' 'nonce-…'` enforced on `/login`, Chromium blocked those two inline scripts and the page
  never hydrated. Adding `'strict-dynamic'` also blocked the 15 nonce-less chunk scripts.
- `/exam/[attemptId]` was the exception under `next start`: its shell was rendered per request, so every script got
  the nonce. But the build records a prerendered fallback shell for that route, which Vercel's CDN can serve as is.
  A nonce there would hold or break depending on which one is served, so it wasn't adopted for one route either.
- Next.js's CSP guide says the same: nonces need fully dynamic rendering, and Partial Prerendering is incompatible
  with them. With Cache Components that would mean giving up the static shell on these routes, and the root
  layout's.
- Hashes don't fit either. The inline payload scripts change per render, and the experimental `sri` option covers
  external files only.

So `'unsafe-inline'` stays. The mitigations: no `'unsafe-eval'` in production, `script-src-attr 'none'`,
`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, React's escaping of all rendered text, and no
`dangerouslySetInnerHTML` of user input. Revisit if Next.js starts applying nonces when it serves a prerendered shell.

## Launch checks that need the Vercel or Supabase dashboards

1. Preview deployments must not share the production database. If they do, stop `vercel-build` from running
   migrations on previews.
2. Supabase storage policies (finding d).
3. Turn Vercel Deployment Protection on for previews.
4. Before enabling the IONOS chat: re-run the network spec (PRIVACY-REVIEW §3) and check finding c in a browser.
