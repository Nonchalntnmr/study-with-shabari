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
fi
npx next build
