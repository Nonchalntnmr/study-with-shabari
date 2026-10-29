# Study with Shabari: deployment readiness report

As of 2026-10-29. Repository: `~/projects/study-with-shabari` (local git, 15 commits, not pushed anywhere).

**Bottom line:** the platform is built and tested locally against production builds, and the Supabase database is provisioned. **Nothing is publicly live.** studywithshabari.com still serves the IONOS parking page. Going live needs a Vercel project, one certificate file, and your approval for the DNS cutover (see "Founder actions").

## Status

| Component | Implemented | Tested | Live | Blockers |
|---|---|---|---|---|
| Main website | Yes: 17 public pages, SEO metadata, sitemap, robots, OG image | Playwright on a production build (34 pass) + axe WCAG 2.1 AA on 10 pages (0 violations) | No | Vercel project (Pro plan for commercial use: paid, needs approval) |
| .com domain | Canonical host, HSTS on HTTPS, canonical URLs | Redirect rules: unit tests + local E2E | No: parking page, HTTPS fails today | DNS cutover approval, plus the Vercel-issued record values |
| .org redirect | 308 → same path on .com (`src/proxy.ts`) | Unit + local E2E (via `x-forwarded-host`) | No | DNS cutover |
| .info redirect | 308 → /resources | Unit + local E2E | No | DNS cutover |
| .store redirect | 308 → /pricing | Unit + local E2E | No | DNS cutover |
| IONOS AI Chat | Official embed script, env-gated, hidden on exam/admin/account pages, CSP allows it; knowledge + guardrail file written | Not testable without an agent ID | No | Agent ID + allowed domains in AI Frontdesk |
| IONOS AI Email | It isn't a mailbox (verified). The site has its own SMTP transport that sends **only** after `MAIL_SENDER_VERIFIED=true`, otherwise records `NOT_CONFIGURED` | Not-configured path tested E2E; real SMTP send untested | No | A paid IONOS mailbox for hello@ + credentials |
| IONOS Instant Domain | Nothing to integrate: it's the domain-only contract (verified) | n/a | Domains registered | None. Don't cancel it. |
| MCAT exam engine | Timed/untimed, passage highlighting, strike-out, flag, navigator, review, autosave + offline backup, resume, server-owned deadline, results with explanations and topic breakdown | 10 integration tests (incl. concurrency and expiry) + 4 E2E flows + axe | No | Deployment |
| Student dashboard | Overview, progress analytics, study plan, history, saved resources, account (test date, password, export, delete) | E2E | No | Deployment |
| Admin dashboard | Overview metrics, inquiries, content workflow (draft → review → published, guarded), editors for questions/passages/exams/topics/resources/pricing/testimonials, JSON import, uploads, users and roles, audit log, question quality | E2E (incl. non-admin denial on every editor) | No | Deployment |
| Booking | Calendly inline embed; a booking is reported only when Calendly itself posts `calendly.event_scheduled` (origin-checked); email fallback | E2E with a Calendly stub | No | Calendly event URL |
| Database | Prisma schema, 3 migrations, RLS on every table | Local integration tests; **on Supabase:** 24/24 tables RLS, `anon`/`authenticated` get *permission denied* | Supabase provisioned and migrated; sample bank in REVIEW; 1 admin | `DATABASE_SSL_CA` certificate for the app's runtime connection; rotate the DB password |
| Authentication | DB sessions (hashed tokens), scrypt passwords, rate limits, guest-to-account claim, password change, email reset (only when mail is verified) | Unit + integration + E2E | No | Deployment |
| Monitoring | `/api/health` (real DB round-trip); Sentry opt-in with all data collection disabled | Health endpoint E2E; Sentry untested (no DSN) | No | Optional Sentry DSN |

## Evidence (commands run on 2026-10-29)

- `npx eslint .`: exit 0. `npx tsc --noEmit`: 0 errors.
- `npx vitest run`: 17 files, **94 tests passed** (unit + integration against a freshly migrated Postgres 17).
- `npx playwright test`: **34 passed**, 1 skipped (mobile-only spec under the desktop project), on `next build` + `next start` against a freshly reset database.
- `next build`: compiled, 54 pages generated.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Supabase `prisma migrate deploy`: 3 migrations applied. Row counts: Exam 3 (REVIEW), Question 24, Choice 96, Passage 3, Topic 19, ExamItem 24, QuestionTopic 31, User 1 (ADMIN), AuditLog 1. Everything else is 0.

## Founder actions

1. **Rotate the Supabase database password.** It was pasted into a chat. Then update `.env`, `.env.supabase.local` and Vercel.
2. **Download Supabase's CA certificate** (Database → SSL configuration) and set it as `DATABASE_SSL_CA` in Vercel. Without it the deployed app can't connect: Supabase's certificate isn't trusted by Node by default.
3. **Approve a Vercel plan.** Hobby is non-commercial-only; a paid tutoring business needs Pro.
4. **Approve the DNS cutover** once the `*.vercel.app` deployment checks out. Exact steps and a rollback snapshot are in `docs/DEPLOYMENT.md`. MX, SPF, DKIM and DMARC stay untouched.
5. **Review and publish the sample practice sets** (Admin → Content). They're original but unreviewed by Shabari, so they're in REVIEW.
6. **Add the real note links** (Admin → Resources) and run `npx prisma db seed` to load the pricing plans and note placeholders.
7. **Confirm the copy:** "a senior at MIT" (from the original page; may be out of date), the admissions page wording, and the $2,000 package contents ("subject to founder confirmation").
8. Optional: Calendly event URL, IONOS chat agent ID, an IONOS mailbox for hello@ (paid), Sentry DSN.
9. **Change the admin password** after first sign-in. The generated one is in `.local/supabase-admin-credentials`.

## Decisions to know about

- **Own sessions instead of Supabase Auth.** Supabase Auth couldn't be run or tested here (no Docker, no credentials). Sessions in Postgres are fully tested, and Supabase is used for Postgres and Storage.
- **No scaled scores, no AAMC affiliation.** Results are percent correct.
- **No fabricated content.** Testimonials are empty until real ones are added with consent, there's no fake chatbot, and no reply-time promises are made.
- **CARS score not shown.** The original page showed only the three science sections.
- **Exam reading font** is Atkinson Hyperlegible, chosen for legibility. Its zero has a slash. To change it, edit `--font-reading` in `globals.css`.

## Known gaps

- CI workflow written but never run (no GitHub remote).
- No admin "preview as student" for unpublished exams, and no per-student performance page (Users shows attempt counts).
- Real SMTP sending, the IONOS chat widget, Sentry and live HTTPS/redirects can only be verified after their credentials and the cutover exist. `SMOKE_BASE_URL=https://studywithshabari.com npx playwright test` covers the last two.
