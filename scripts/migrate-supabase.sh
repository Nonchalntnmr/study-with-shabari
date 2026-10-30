#!/usr/bin/env bash
# Gated migrations for the Supabase database (docs/STAGING.md, "Release steps").
#   bash scripts/migrate-supabase.sh           # plan only: what is pending, and a destructive-SQL check
#   bash scripts/migrate-supabase.sh --apply   # then apply with `prisma migrate deploy` and pin old attempts
# Reads SUPABASE_DIRECT_URL (session pooler, port 5432) from .env.supabase.local. Never prints it.
# Additive only: refuses if a pending migration drops, renames, truncates, deletes or retypes anything.
# It never resets the database and never runs `prisma migrate dev`.
# Every connection verifies the server against Supabase's root CA (certs/supabase-root-2021.pem):
# prisma.config.ts passes it to the schema engine with sslaccept=strict, and pin-legacy-attempts
# goes through src/lib/db-config.ts. On macOS the schema engine can't verify Supabase's five-year
# pooler certificate (Apple's trust policy rejects it), so this stops there and the production build
# on Vercel, which runs `prisma migrate deploy` on Linux with the same CA, is the way to migrate.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.supabase.local ] || { echo "missing .env.supabase.local" >&2; exit 1; }
if grep -q '\[NEW-PASSWORD\]' .env.supabase.local; then
  echo "refusing: .env.supabase.local still has the [NEW-PASSWORD] placeholder; fill in the rotated password first" >&2
  exit 1
fi
URL="$(grep -E '^SUPABASE_DIRECT_URL=' .env.supabase.local | head -1 | cut -d= -f2- | sed -E 's/^"//; s/"$//')"
case "$URL" in *pooler.supabase.com:5432*) ;; *) echo "refusing: SUPABASE_DIRECT_URL must be the session pooler on port 5432" >&2; exit 1;; esac
export DATABASE_URL="$URL" DIRECT_URL="$URL"
DATABASE_SSL_CA="$(cat certs/supabase-root-2021.pem)"
export DATABASE_SSL_CA

echo "== migration status (Supabase)"
status="$(npx prisma migrate status 2>&1 || true)"
echo "$status" | grep -vE "postgres(ql)?://" | sed -E 's#://[^@]*@#://<redacted>@#g'

if echo "$status" | grep -qE "^Error: P1011" && [ "$(uname)" = "Darwin" ]; then
  echo "refusing: macOS can't verify Supabase's pooler certificate in Prisma's TLS stack; nothing was changed." >&2
  echo "Migrations run in the production build on Vercel, which verifies it (scripts/vercel-build.sh)." >&2
  exit 1
fi
if echo "$status" | grep -qE "^Error: P[0-9]{4}"; then
  echo "refusing: could not read the migration status (see the error above); nothing was changed" >&2
  exit 1
fi
pending="$(echo "$status" | awk '/have not yet been applied/{f=1;next} f&&/^[0-9]{14}_/{print $1} f&&/^$/{if(n++)f=0}')"
if [ -z "$pending" ]; then
  echo "== nothing pending"
else
  echo "== pending:"; echo "$pending" | sed 's/^/   /'
  for m in $pending; do
    sql="prisma/migrations/$m/migration.sql"
    if grep -n -i -E "DROP (TABLE|COLUMN|INDEX|TYPE|SCHEMA)|RENAME|ALTER COLUMN .* TYPE|TRUNCATE|DELETE FROM" "$sql" | grep -v "DROP CONSTRAINT IF EXISTS"; then
      echo "refusing: $m contains a destructive statement (above)" >&2; exit 1
    fi
  done
  echo "== destructive-SQL check: none found"
fi

if [ "${1:-}" != "--apply" ]; then
  echo "== plan only. Re-run with --apply to apply the pending migrations."
  exit 0
fi

[ -n "$pending" ] && npx prisma migrate deploy 2>&1 | sed -E 's#://[^@]*@#://<redacted>@#g'
echo "== pinning attempts created before question versioning"
npx tsx scripts/pin-legacy-attempts.ts
echo "== status after"
npx prisma migrate status 2>&1 | grep -E "up to date|not yet been applied|^[0-9]{14}_" | sed -E 's#://[^@]*@#://<redacted>@#g'
