# Vercel environment variables

This page lists the variables for the Vercel project `nishanth-s-projects-b6c2e422/study-with-shabari`. It
never holds a secret value.

- **Non-secret variables** are set from the CLI. Their values are shown here.
- **Secret variables** (marked 🔒) are pasted by the founder in the Vercel dashboard: Project → Settings →
  Environment Variables. They are never printed, committed or put in chat.

**Environments:**

- **Production** is studywithshabari.com, once DNS is switched.
- **Preview** is a protected `*.vercel.app` deployment (Deployment Protection on).
- **Development** is only for `vercel env pull`; local work uses `.env`.

Preview and Production share the one Supabase project, so:

- Preview never runs migrations;
- previews must stay behind Deployment Protection.

## Database (Supabase project `oxihkuivrwnwlrsolwzx`, us-east-1)

| Variable | Production | Preview | Value comes from |
|---|---|---|---|
| `DATABASE_URL` 🔒 | ✓ | ✓ | The **transaction pooler**: `postgresql://postgres.oxihkuivrwnwlrsolwzx:<password>@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`. The password is the rotated one, from Supabase → Database → Settings. |
| `DIRECT_URL` 🔒 | ✓ | ✓ | The **session pooler**, same host on port `5432` with no `pgbouncer` parameter. Prisma's migration tooling uses it. The direct `db.*.supabase.co` host is IPv6-only, so don't use it. |
| `DATABASE_SSL_CA` 🔒 | ✓ | ✓ | The PEM certificate from Supabase → Database → Settings → SSL configuration, pasted whole. `\n` escapes also work. The app verifies the server against it (`src/lib/db-config.ts`) and ignores `sslmode` in the URLs. |
| `DATABASE_POOL_MAX` | optional | optional | Connections per function instance (default 5). Leave it unset unless the pooler reports exhaustion. |

## Auth and jobs

| Variable | Production | Preview | Value comes from |
|---|---|---|---|
| `AUTH_SECRET` 🔒 | ✓ | ✓ | A random string of 32+ bytes, e.g. `openssl rand -base64 48`. Use a **different** value for Preview. Changing it signs everyone out and resets the rate-limit keys. |
| `CRON_SECRET` 🔒 | ✓ | — | A random string. Vercel Cron sends it as `Authorization: Bearer …` to `/api/cron/retention` (daily, 09:00 UTC, Production only). |

## Site and contact (non-secret, set from the CLI)

| Variable | Production | Preview | Value |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | ✓ | — | `https://studywithshabari.com`. Unset on Preview, where the app falls back to the same canonical URL, so canonical tags never point at a preview. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | ✓ | ✓ | `jshankar@mit.edu` |
| `ADMIN_NOTIFY_EMAIL` | ✓ | ✓ | `jshankar@mit.edu` |
| `MAIL_SENDER_VERIFIED` | ✓ | ✓ | `false` until an IONOS mailbox is set up and verified. With `false`, no email is ever sent. |
| `INQUIRY_RETENTION_DAYS` | ✓ | ✓ | `90` (provisional, pending the founder's approval) |
| `INQUIRY_PURGE` | — | — | Leave it unset; the job only reports counts. Set `on` only after the founder approves the period. |
| `LESSON_PREVIEW` | — | ✓ | `on` for Preview only. Unapproved, AI-drafted lessons then show there with the draft badge, so the founder can review them. Production never shows them. This is safe only while Deployment Protection is on, because Preview shares the production database. Remove it once the lesson is approved. |
| `MIGRATE_ON_BUILD` | — | — | **Never set it in this project.** Preview shares the production database, and Production builds already migrate (`scripts/vercel-build.sh`). |

## Booking, storage, mail, monitoring

| Variable | Production | Preview | Value comes from |
|---|---|---|---|
| `NEXT_PUBLIC_CALENDLY_URL_MCAT` | ✓ | ✓ | The founder's MCAT 15-minute event link, `https://calendly.com/…`. Until it's set, booking shows the honest fallback (request a time by email). |
| `NEXT_PUBLIC_CALENDLY_URL_ADMISSIONS` | ✓ | ✓ | The founder's College Admissions event link. |
| `NEXT_PUBLIC_CALENDLY_URL` | — | — | The old single link. It only serves MCAT if `_MCAT` is empty, so it isn't needed. |
| `SUPABASE_URL` | ✓ | ✓ | `https://oxihkuivrwnwlrsolwzx.supabase.co`, for image uploads in admin. |
| `SUPABASE_SERVICE_ROLE_KEY` 🔒 | ✓ | ✓ | Supabase → Project Settings → API → `service_role`. It is server-only, and never goes in a `NEXT_PUBLIC_` variable. |
| `SUPABASE_STORAGE_BUCKET` | ✓ | ✓ | `diagrams` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `MAIL_FROM` | later | — | The IONOS mailbox settings (`smtp.ionos.com`, `587`, the mailbox address), once a mailbox exists. See `docs/IONOS.md`. |
| `SMTP_PASSWORD` 🔒 | later | — | The IONOS mailbox password. |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` 🔒, `SENTRY_ORG`, `SENTRY_PROJECT` | optional | — | Off unless the founder wants error monitoring. With it on, no user data, cookies, headers, bodies or query strings are collected. |
| `NEXT_PUBLIC_IONOS_CHAT_AGENT_ID` | optional | — | From IONOS AI Frontdesk → Website widget, if the chat is wanted. Add its hosts to the privacy page first (`docs/PRIVACY-REVIEW.md`). |

## Set by Vercel (don't add)

`VERCEL`, `VERCEL_ENV`, `VERCEL_URL` and `VERCEL_OIDC_TOKEN` are provided by Vercel. `VERCEL_ENV` controls:

- indexing: `robots.txt` allows crawling only on Production;
- migrations on build;
- the lesson preview gate.

## Local only (never on Vercel)

`TEST_DATABASE_URL`, `E2E_DATABASE_URL`, `E2E_PORT`, `NEXT_DIST_DIR`, `SMOKE_BASE_URL`, `JOURNEY_SHOTS_DIR`,
`M2_SHOTS_DIR`, `ADMIN_PASSWORD` (used by `scripts/create-admin.ts`), `SITE_ENV`.
