# Staging and release configuration

This file is configuration only. Nothing here has been deployed, and the production Supabase project has not
been connected to this branch. Every step that touches Vercel, Supabase or DNS needs the owner's approval
first.

## Environments

| | Production | Staging (Vercel Preview, protected) | Local |
|---|---|---|---|
| Domain | studywithshabari.com | a Vercel preview URL or `staging.studywithshabari.com`, behind Deployment Protection | localhost |
| Database | production Supabase project | a **separate** Supabase project (never the production one) | local Postgres (`sws_dev`) |
| Migrations on build | yes (`VERCEL_ENV=production`) | only with `MIGRATE_ON_BUILD=1`, set in the Preview scope **only** when that scope points at the staging database | `npx prisma migrate dev` |
| Unapproved lessons shown | never (admins only) | `LESSON_PREVIEW=on` (draft badge shown) | always in `next dev` |
| Daily retention job | Vercel Cron, Production only | none (Vercel runs crons on Production only) | run by hand |
| Contact-message purge | `INQUIRY_PURGE` empty (report-only) until the founder approves the period | empty | empty |

`scripts/vercel-build.sh` enforces the migration rule. It runs `prisma migrate deploy` only when
`VERCEL_ENV=production` or `MIGRATE_ON_BUILD=1`. Otherwise it prints that it skipped the migration and builds.

## Environment variables, by name

Values are never written here. `.env.example` describes each one.

| Variable | Production | Staging |
|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | production pooler URLs | staging pooler URLs |
| `DATABASE_SSL_CA` | Supabase CA certificate | Supabase CA certificate |
| `AUTH_SECRET` | long random string | a different long random string |
| `CRON_SECRET` | long random string (Vercel sends it as a bearer token) | not needed |
| `NEXT_PUBLIC_SITE_URL` | `https://studywithshabari.com` | the staging URL |
| `NEXT_PUBLIC_CALENDLY_URL_MCAT` and `NEXT_PUBLIC_CALENDLY_URL_ADMISSIONS` | the founder's two event links | the same, or test links |
| `NEXT_PUBLIC_CALENDLY_URL` | legacy single link; still serves MCAT if `_MCAT` is empty | optional |
| `LESSON_PREVIEW` | empty | `on` |
| `MIGRATE_ON_BUILD` | empty | `1` |
| `INQUIRY_RETENTION_DAYS`, `INQUIRY_PURGE` | `90` (provisional), and empty until approved | same |
| Mail transport, `MAIL_SENDER_VERIFIED`, `ADMIN_NOTIFY_EMAIL` | per `docs/DEPLOYMENT.md` | `MAIL_SENDER_VERIFIED=false`, so staging never emails real people |
| `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_IONOS_CHAT_AGENT_ID` | optional, off by default | off |

## Release steps (each needs approval)

1. **Staging project:** create the staging Supabase project and set the Preview-scope variables above. Turn
   Deployment Protection on for previews.
2. **First staging deploy:** deploy this branch to staging. The build migrates the staging database
   (`MIGRATE_ON_BUILD=1`).
3. **Staging data:** seed it with `npx prisma db seed`, which imports the samples and the lesson as REVIEW,
   then create an admin with `npm run admin:create`.
4. **Staging checks:**
   - run the post-deploy smoke spec (`SMOKE_BASE_URL=<staging url> npx playwright test --project post-deploy`);
   - test on real phones (iOS Safari and Android Chrome);
   - run a short autosave load test.
5. **Founder approvals:** the Concept B visuals (CD review), the dopamine lesson in `/admin/lessons`, the
   sample sets in Admin → Content, and the 90-day contact-message period.
6. **Production:** merge into `main`, then the production deploy. Its build runs `prisma migrate deploy`. That
   adds `20261029132749_question_versions`, which only adds tables and columns, and the earlier lesson
   migrations if they aren't applied yet.
7. **Pin old attempts:** once, run `DATABASE_URL=<production direct url> npx tsx scripts/pin-legacy-attempts.ts`.
   It pins any attempts that predate versioning, and the daily job repeats it as a safety net.
8. **Cron check:** set `CRON_SECRET` in Production. Call `/api/cron/retention` once with the bearer token and
   check the counts.

## Rollback

- **Code:** Vercel's instant rollback to the previous production deployment.
  - The migrations on this branch only add tables and columns: `question_versions`, `Attempt.questionVersionIds`,
    `retestOfId` and `Response.clientChangedAt`. They add no drops or renames.
  - Older code ignores the new columns and tables, so rolling code back needs no database change.
- **Data:** Supabase point-in-time recovery, or a backup taken just before step 6. The question-versions
  migration doesn't rewrite existing rows. The pinning script only fills `questionVersionIds` on attempts
  where it is empty.
- **Content:** every approved lesson version and every question version stays in the database, and attempts
  stay pinned to the versions they used.
  - `/admin/lessons` shows a lesson's version history and diffs, but it has no one-click restore yet.
  - To restore a lesson, edit the draft back to the earlier text and approve it again.
