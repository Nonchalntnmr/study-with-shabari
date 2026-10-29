# Deploying Study with Shabari

Production runs on **Vercel**, with the database and image storage on **Supabase** and the domains and DNS on **IONOS**. Nothing below has been done yet: no Vercel project, Supabase project, or DNS change exists. Steps marked **(founder)** need account access, and anything that costs money or changes live DNS needs approval first.

Estimated cost: Vercel Hobby and Supabase Free tiers cover launch traffic. One caveat: Vercel's Hobby plan is for non-commercial use, and this is a paid tutoring business, so plan on **Vercel Pro (paid)**. That needs approval. The IONOS mailbox for `hello@` is also a paid add-on (see [IONOS.md](./IONOS.md)).

## 1. Supabase (founder or developer with access)

1. Create a project in **US East (N. Virginia)**, which matches the Vercel region `iad1` in `vercel.json`.
2. Project Settings → Database → Connection string:
   - **Transaction pooler** (port 6543) → `DATABASE_URL`
   - **Direct** or **Session pooler** (port 5432) → `DIRECT_URL` (used only by migrations)
3. Storage → New bucket `diagrams`, **public** (question diagrams are shown to everyone taking a set). Copy the project URL and the `service_role` key. Treat the key as a password: it belongs only in Vercel's server environment, never in a `NEXT_PUBLIC_` variable.
4. Nothing else in Supabase needs configuring. The app doesn't use Supabase Auth or the Data API. Migration `enable_rls` turns on row-level security for every table, so the auto-generated API exposes nothing even if its keys leak.

## 2. Vercel project

1. Push this repository to a **private** GitHub repository, then import it into Vercel. The build command comes from `vercel.json` (`prisma generate && prisma migrate deploy && next build`).
2. Environment variables for **Production**. Set Preview to a separate Supabase project or branch, because every build runs migrations against the database it points to:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler URL |
| `DIRECT_URL` | Supabase direct/session URL |
| `AUTH_SECRET` | `openssl rand -base64 48` |
| `NEXT_PUBLIC_SITE_URL` | `https://studywithshabari.com` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `jshankar@mit.edu` until `hello@` is verified |
| `ADMIN_NOTIFY_EMAIL` | where new-inquiry notifications go |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=diagrams` | from step 1 |
| `NEXT_PUBLIC_CALENDLY_URL` | your 15-minute event link (optional; email fallback otherwise) |
| `NEXT_PUBLIC_IONOS_CHAT_AGENT_ID` | optional, see IONOS.md |
| `NEXT_PUBLIC_SENTRY_DSN` | optional |
| `SMTP_*`, `MAIL_FROM`, `MAIL_SENDER_VERIFIED` | leave unset until the mailbox is verified |

`VERCEL_ENV` is set by Vercel automatically. Only `production` is indexable by search engines (robots.txt and meta robots). Previews are always `noindex`.

3. Deploy. The first build applies all migrations to the empty Supabase database.

## 3. First-run data (developer, against production, once)

```bash
# with DATABASE_URL/DIRECT_URL exported for production:
npx prisma db seed        # pricing, note placeholders, sample sets in REVIEW
ADMIN_PASSWORD='…' npm run admin:create -- <shabari's email> "Shabari Shankar"
```

Sample practice sets are seeded in **REVIEW**, not published, so Shabari reads them first. Publish them in Admin → Content: passage, then questions, then the exam. Add the real note links in Admin → Resources.

## 4. Check the deployment before touching DNS

On the `*.vercel.app` URL:

```bash
curl -s https://<project>.vercel.app/api/health          # {"ok":true,"db":"up",...}
```

- Sign in as the admin, open Admin → Overview.
- Take a practice set as a guest, submit, check the results.
- Send the contact form. It should appear in Admin → Inquiries with emails `NOT_CONFIGURED`.

## 5. DNS cutover (founder approval required)

**Don't start until step 4 passes and Shabari approves.** DNS is at IONOS (Domains & SSL → domain → DNS).

### Current records (snapshot, 2026-10-29), for rollback

| Domain | A | AAAA | MX | TXT | Other |
|---|---|---|---|---|---|
| studywithshabari.com | 74.208.236.152 | 2607:f1c0:100f:f000::200 | mx00/mx01.ionos.com | `v=spf1 include:_spf-us.ionos.com ~all` | `_dmarc` CNAME → dmarc.ionos.com; DKIM `s1-ionos`/`s2-ionos._domainkey` |
| studywithshabari.org | 74.208.236.203 | 2607:f1c0:100f:f000::200 | mx00/mx01.ionos.com | same SPF | |
| studywithshabari.info | 74.208.236.247 | 2607:f1c0:100f:f000::200 | mx00/mx01.ionos.com | same SPF | |
| studywithshabari.store | 74.208.236.156 | 2607:f1c0:100f:f000::200 | mx00/mx01.ionos.com | same SPF | |
| www.* | none | | | | |

### Steps

1. In Vercel → Project → Settings → Domains, add all eight hosts: `studywithshabari.com`, `www.studywithshabari.com`, and the bare and `www.` forms of `.org`, `.info` and `.store`. Mark `studywithshabari.com` as primary. Don't configure Vercel-level redirects: the app's proxy (`src/proxy.ts`) sends www → apex, .org → same path on .com, .info → /resources and .store → /pricing, all with 308.
2. Vercel shows the **exact records for this project** on each domain card. Use those values. Don't copy addresses from blog posts or from this file.
3. At IONOS, for **each** of the four domains:
   - Edit the apex **A** record to the value Vercel shows. Remove any other A record for `@`.
   - **Delete the AAAA record** for `@`. Vercel doesn't serve IPv6 for external DNS, and the IONOS one points at the parking page.
   - Add **CNAME** `www` → the value Vercel shows.
   - If Vercel asks for a `_vercel` **TXT** verification record, add it.
   - **Don't touch** MX, the SPF TXT, `_dmarc`, or any `_domainkey` records. Email depends on them.
4. Wait until each Vercel domain card shows "Valid Configuration". Vercel then issues certificates automatically.
5. Verify from your machine:

```bash
for d in studywithshabari.com www.studywithshabari.com studywithshabari.org studywithshabari.info studywithshabari.store; do
  printf "%-28s A=%s AAAA=%s\n" $d "$(dig +short A $d | tr '\n' ' ')" "$(dig +short AAAA $d | tr '\n' ' ')"
done
dig +short MX studywithshabari.com          # still mx00/mx01.ionos.com
SMOKE_BASE_URL=https://studywithshabari.com npx playwright test   # brief items 15-16: redirects + HTTPS
```

**Rollback:** restore the A/AAAA values in the snapshot table and delete the `www` CNAMEs. Email isn't affected either way.

## 6. After launch

- `GET /api/health` is the uptime check (it does a real database round trip).
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit and integration tests, and the Playwright suite on every push. It hasn't run yet because the repository hasn't been pushed.
- Backups: check what your Supabase plan includes (Database → Backups) before the database holds anything irreplaceable. Paid plans add scheduled backups.
