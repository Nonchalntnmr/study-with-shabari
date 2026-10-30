# Database password rotation: audited runbook (2026-10-30)

Status: **prepared, not executed.** Run only after the founder approves.

## Audit of `.local/rotate-db-password.sh`

Good:
- Prints no secret. Values flow file → stdin → `vercel env add --sensitive`.
- Refuses to touch Vercel unless **both** pooler URLs connect with the new password **and** the certificate verifies (`verified=true`).
- `set -euo pipefail`, so any failed step stops the script.
- Rebuilds the current production deployment and polls `/api/health` until the database reports `up`.

Risks found:
1. **Downtime window (unavoidable with one password).** Between "Reset database password" in Supabase and the
   redeploy finishing, production can't open new database connections. Expect about 2–4 minutes: the build plus
   the health polling. Mitigation: run it at low traffic, with every step pre-staged.
2. **Errors were hidden.** `vercel env add` output went to `/dev/null 2>&1`, so a failure stopped the script with no
   reason shown. *Fixed:* stderr is now visible. Values are piped on stdin, so stderr can't contain the secret.
3. **The redeploy runs the production build, which runs `prisma migrate deploy`.** That's safe today because there are
   no pending migrations. Before rotating, confirm `npx prisma migrate status` reports "up to date".
4. **No automatic rollback.** Rolling back the deployment would restore the *old* password, which no longer works.
   Recovery is fix-forward (below).

## Optional zero-downtime alternative (recommended for future rotations)

Create a dedicated runtime role (for example `sws_app`) with only the privileges the app needs, and point Vercel
at it. Rotating then means giving that role a second password and switching Vercel to it, while the old one stays
valid until the new deploy is healthy. That's a production database change, so it needs separate approval and is
**not** part of tonight's runbook.

## Procedure (about 10 minutes, founder at the keyboard)

1. **Pre-checks (no changes yet):**
   - **Migrations:** `npx vercel inspect <current production deployment> --logs | grep -E "No pending migrations|migrations found"` → no pending migrations.
     - Don't use `npx prisma migrate status` on the Mac. Since 2026-10-30, local `.env` points at local Postgres, so it would check the wrong database.
     - Against Supabase it is refused, because macOS can't verify the pooler's certificate (see the review below).
   - **Health:** `curl -s https://studywithshabari.com/api/health` → `"db":"up"`.
2. **Supabase:** Project Settings → Database → **Reset database password**. Use Generate, copy it, and save it in your password manager **first**.
3. Immediately: `bash .local/set-db-password.sh`, then paste. It now updates `.env.supabase.local` only (local `.env` stays on local Postgres) and prints `updated N line(s)`.
4. Immediately: `bash .local/rotate-db-password.sh`. It ends with `== done: production uses the new password`.
5. **Verify:** `curl -s https://studywithshabari.com/api/health` → `"db":"up"`. Sign in at /login. Open /practice; until Shabari approves a set, it shows the coming-soon state.

## Recovery (if step 4 fails)

- **"refusing: … doesn't connect"**: the new password in the local files is wrong. Vercel is unchanged, but
  production is already down (Supabase changed). Re-run step 3 with the password from your password manager, then step 4.
- **The env step failed:** read the shown error (usually an expired Vercel login, fixed with `npx vercel login`), then re-run step 4.
  It's idempotent.
- **The health check keeps failing after the redeploy:** Vercel → Deployments → open the newest → Runtime Logs. If it's an
  authentication failure, the password in Vercel is wrong, so redo steps 3–4. If the password itself is lost, redo from step 2
  (Supabase can always issue a new one).
- **Worst case, 10+ minutes down:** Supabase → Reset password again, then steps 3–4. Never roll back the deployment
  to fix a password problem.

## Review (2026-10-30, before tonight's stabilization deploy)

The script and procedure still hold after the stabilization changes. These notes were checked against the code; nothing was run.

- **Certificate checks are now strict everywhere.**
  - The app and every script go through `src/lib/db-config.ts`. It refuses a non-local host without `DATABASE_SSL_CA`.
  - Migrations go through `prisma.config.ts`, which uses `sslaccept=strict`.
  - `tls-check.mts` passes the CA explicitly, so step 4's `verified=true` check is unchanged.
- **The redeploy migrates with a verified certificate.**
  - The production build runs `prisma migrate deploy` with Supabase's root CA. A preview build on 2026-10-30 confirmed that Vercel's Linux build machine verifies it.
  - If verification ever failed, the build would stop and the old deployment would keep serving. During a rotation, that keeps the downtime going until it's fixed forward.
- **macOS can't run Supabase migrations.**
  - Apple's trust policy rejects the pooler's five-year certificate, which also lacks a serverAuth EKU. Node and OpenSSL accept it.
  - That is why step 1 reads the build log rather than running `prisma migrate status` locally.
- **Preview deployments built before the rotation lose their database.** They keep the old URLs. They're behind Vercel Authentication, so rebuild one only if it's needed.
- **No change to the downtime estimate (2–4 minutes) or to the fix-forward recovery.**
