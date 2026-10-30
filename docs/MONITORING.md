# Monitoring: prepared, not switched on

**Status (2026-10-30):** there is no error monitoring or uptime monitoring in production.

- `NEXT_PUBLIC_SENTRY_DSN` is unset, so `src/instrumentation.ts` and `src/instrumentation-client.ts` do nothing.
- No Marketplace integration is installed (`npx vercel integration installations`).
- What exists today:
  - **Vercel's runtime logs:** Project → Logs.
  - **`/api/health`:** a database round trip that returns 503 when the database is down.
  - **The daily cron's logs.**

Both options below have free tiers, but each creates an account with the provider. **Nothing here is done until the
founder approves it.**

## Option 1: Sentry for errors, through the Vercel Marketplace (preferred)

The Marketplace integration creates the Sentry project and writes its keys straight into the Vercel project's
environment variables. Nobody copies a DSN or a token, and nothing goes in chat.

1. **Founder, at a terminal in the main checkout:** `npx vercel integration add sentry`. Pick the free plan, and accept
   Sentry's terms in the browser when asked.
2. **Check that the variables are present, by name only:** `npx vercel env ls | grep -i sentry`. The app reads
   `NEXT_PUBLIC_SENTRY_DSN` (and `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` for source-map upload).
   - If the integration uses other names, map them in Vercel. Don't paste the values anywhere else.
3. **Redeploy production once.** The CSP adds the DSN's own ingest host only when the DSN is set (`src/lib/csp.ts`), so a
   redeploy is required.
4. **Privacy:**
   - `src/lib/sentry-options.ts` already drops user data, cookies, headers, request bodies and query strings.
   - Before switching it on, add Sentry to the processors listed in `src/app/(site)/privacy/page.tsx`, and update
     `docs/PRIVACY-REVIEW.md`.
5. **Verify:** throw a test error from a preview deployment, not production, and confirm it arrives without any
   personal data.

**Manual alternative:** create a free Sentry account, then set the variables with
`npx vercel env add NEXT_PUBLIC_SENTRY_DSN production`. That reads the value from the terminal prompt, so it never
appears in chat or in shell history.

## Option 2: uptime checks

- **Checkly, through the Vercel Marketplace:** `npx vercel integration add checkly`, on the free Hobby plan.
  - Add a check for `GET https://studywithshabari.com/api/health` that expects 200 and `"db":"up"`, every 5–10 minutes.
  - Alert the founder's email.
- **Or any free external monitor** (Better Stack, UptimeRobot) on the same URL.

Keep the interval at 5 minutes or longer. `/api/health` opens a database connection every time, and the pool is small.

## What to watch either way

- **`/api/health`:** 503, or `"db":"down"`.
- **The daily cron:** `/api/cron/retention` at 09:00 UTC, in Vercel → Project → Cron Jobs. It returns 401 without the
  bearer token by design.
- **Build failures:** Vercel emails the account on a failed production deployment.
