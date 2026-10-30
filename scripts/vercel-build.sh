#!/usr/bin/env bash
# Vercel build. Migrations run only where the database is known to be this deployment's own:
# production, or a staging database that opts in with MIGRATE_ON_BUILD=1. A preview build can
# therefore never migrate the production database by accident (SECURITY-AUDIT.md, finding a).
set -euo pipefail
npx prisma generate
if [ "${VERCEL_ENV:-}" = "production" ] || [ "${MIGRATE_ON_BUILD:-}" = "1" ]; then
  npx prisma migrate deploy
else
  echo "vercel-build: skipping prisma migrate deploy (VERCEL_ENV=${VERCEL_ENV:-unset}; set MIGRATE_ON_BUILD=1 only for a dedicated staging database)"
  # Read-only: proves this build machine reaches the database with a verified certificate
  # (prisma.config.ts, sslaccept=strict), the way the production build's migration will.
  # Pending migrations are fine here; a connection or certificate error is not.
  if ! status="$(npx prisma migrate status 2>&1)"; then
    if echo "$status" | grep -qE "Error: P10[0-9]{2}"; then
      echo "$status" | grep -E "^Error|P10[0-9]{2}" >&2
      echo "vercel-build: the database check failed; not building" >&2
      exit 1
    fi
  fi
  echo "vercel-build: database reached with a verified certificate"
fi
npx next build
