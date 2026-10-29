# Study with Shabari

MCAT tutoring site and practice platform for Shabari Shankar: the public site, a computer-based practice exam engine, student dashboards, and an admin area for content and inquiries.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind v4 + shadcn/ui · Prisma 7 + PostgreSQL (Supabase in production) · Zod · Vitest · Playwright · optional Sentry. Hosting target: Vercel. Domains/DNS: IONOS.

## Run it locally

Requires Node 22 and PostgreSQL 17 binaries (`brew install postgresql@17`). Docker isn't needed.

```bash
npm install
cp .env.example .env              # then set AUTH_SECRET (openssl rand -base64 48)
npm run db:local -- start         # isolated cluster in .local/pg on 127.0.0.1:54329
npx prisma migrate deploy
npx tsx prisma/seed.ts --publish-samples
ADMIN_PASSWORD='choose-one-10+' npm run admin:create -- you@example.com "Your Name"
npm run dev                       # http://localhost:3000
```

## Tests

```bash
npm run lint && npm run typecheck
npx vitest run                    # unit + integration (integration uses sws_test, wiped each run)
npx playwright test               # production build on :3100 against a reset sws_e2e database
SMOKE_BASE_URL=https://studywithshabari.com npx playwright test   # post-deploy redirects + HTTPS
```

## Where things are

| Path | What |
|---|---|
| `src/app/(site)` | Public pages |
| `src/app/exam/[attemptId]` | Exam runner and results |
| `src/app/dashboard` | Student dashboard |
| `src/app/admin` | Admin area (every page calls `requireAdmin()`) |
| `src/app/api/attempts` | Autosave and submit endpoints (same-origin checked) |
| `src/lib/exam` | Exam domain: timing, scoring, highlights, attempt service |
| `src/lib/auth` | Sessions, passwords, data access layer |
| `src/lib/security` | Rate limiting, CSRF origin check, audit log, hashing |
| `src/lib/site.ts` | **All founder facts shown on the site**, in one place |
| `src/proxy.ts` | Domain redirects, optimistic sign-in redirect |
| `prisma/` | Schema, migrations (incl. RLS on every table), seed |
| `content/samples` | Original sample question bank |
| `docs/` | [Deployment and DNS](docs/DEPLOYMENT.md), [IONOS findings](docs/IONOS.md), [content format](docs/CONTENT_FORMAT.md), [chat assistant knowledge](docs/ionos-chat-knowledge.md) |

## Design decisions worth knowing

- **Auth is database sessions, not Supabase Auth.** Sessions are random tokens, and only their SHA-256 is stored. Passwords use scrypt. Supabase is the Postgres host and image store only. This keeps auth fully testable locally, and row-level security means Supabase's public API can read nothing.
- **The server owns the clock.** A timed attempt's deadline is fixed when it starts. Writes are refused 5 s after it passes, and the attempt is scored at the deadline. The browser only displays it.
- **No scaled scores.** Results are percent correct on original questions. Nothing claims AAMC affiliation.
- **Email is never sent from an unverified sender.** Until `MAIL_SENDER_VERIFIED=true` and SMTP are configured, messages are recorded as `NOT_CONFIGURED`.
