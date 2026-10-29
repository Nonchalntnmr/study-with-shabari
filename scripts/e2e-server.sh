#!/usr/bin/env bash
# Production build + server for Playwright, on a throwaway local database.
# Resets sws_e2e, applies migrations, seeds published samples, creates the E2E admin, publishes the lesson fixture.
set -euo pipefail
cd "$(dirname "$0")/.."

export E2E_DB_URL="${E2E_DATABASE_URL:-postgresql://shabari@127.0.0.1:54329/sws_e2e}"
case "$E2E_DB_URL" in *e2e*) ;; *) echo "refusing: E2E database URL must contain 'e2e'" >&2; exit 1;; esac

export DATABASE_URL="$E2E_DB_URL" DIRECT_URL="$E2E_DB_URL"
export NEXT_PUBLIC_SITE_URL="http://localhost:${E2E_PORT:-3100}"
export NEXT_PUBLIC_CALENDLY_URL="https://calendly.com/e2e-shabari/15min"
export NEXT_PUBLIC_CONTACT_EMAIL="jshankar@mit.edu"
export ADMIN_NOTIFY_EMAIL="jshankar@mit.edu"
export MAIL_SENDER_VERIFIED="false"
export AUTH_SECRET="${AUTH_SECRET:-e2e-only-secret-e2e-only-secret-e2e-only}"
export NEXT_DIST_DIR="${NEXT_DIST_DIR:-.next-e2e}"

psql "$E2E_DB_URL" -q -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
npx prisma migrate deploy >/dev/null
npx tsx prisma/seed.ts --publish-samples >/dev/null
ADMIN_PASSWORD="e2e-admin-password-123" npx tsx scripts/create-admin.ts admin@e2e.test "E2E Admin" >/dev/null
# The seed imports lessons as unpublished AI drafts; approve the dopamine lesson here, in this throwaway database only.
npx tsx scripts/publish-lesson-fixture.ts dopamine admin@e2e.test >/dev/null

if [ "${E2E_SKIP_BUILD:-}" != "1" ]; then npx next build >/dev/null; fi
exec npx next start --port "${E2E_PORT:-3100}"
