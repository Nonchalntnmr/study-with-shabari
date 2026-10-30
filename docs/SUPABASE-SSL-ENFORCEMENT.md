# Supabase "Enforce SSL on incoming connections": prepared, not changed

**Status (2026-10-30):** the setting is **off**, and it stays off until the founder approves it. Turning it on makes
Supabase refuse any connection that doesn't use TLS. Every path this project uses already uses TLS and verifies the
certificate, so enforcing it should change nothing for the site.

## Connection paths, checked before enabling

| Path | Host and port | TLS | Verified how |
|---|---|---|---|
| App at runtime (Vercel) | pooler `:6543` | yes, `rejectUnauthorized: true` against Supabase Root 2021 CA | `src/lib/db-config.ts` refuses to connect without the CA; `/api/health` is up in production |
| Production build migrations (Vercel, Linux) | pooler `:5432` | yes, Prisma `sslaccept=strict` with the same CA | `prisma.config.ts`; a preview build logged "database reached with a verified certificate" |
| Local scripts (`scripts/*.ts`, the seed) | pooler `:5432` | yes, through `poolConfig` | they refuse a Supabase host without `DATABASE_SSL_CA` |
| Local migrations from a Mac | pooler `:5432` | refused | macOS rejects the pooler certificate; migrations run in the production build instead |
| Supabase dashboard, SQL editor, backups | inside Supabase | managed by Supabase | not affected by this setting |

Nothing in the repo connects without TLS. The only plaintext connections are to local Postgres on 127.0.0.1, which
this setting doesn't cover.

## Steps (founder, in the Supabase dashboard)

1. **Before:**
   - Run `curl -s https://studywithshabari.com/api/health` and expect `"db":"up"`.
   - Pick a quiet time. Supabase may briefly restart the database to apply the change.
2. **Turn it on:** Project `oxihkuivrwnwlrsolwzx` → **Database** → **Settings** → **SSL Configuration** → turn on
   **Enforce SSL on incoming connections**.
3. **After:**
   - Re-run the health check. Sign in at `/login` with a wrong password and expect "That email and password don’t match."
   - Then trigger one preview build. Its log must show "database reached with a verified certificate".
4. **Undo:** turn the same switch off. No code or environment change is involved either way.
