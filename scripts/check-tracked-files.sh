#!/usr/bin/env bash
# Fails if a file that must never be committed is tracked: .env files (except .env.example),
# the .local and .vercel folders, and private keys or certificates (except Supabase's public root CA).
set -euo pipefail
cd "$(dirname "$0")/.."
bad="$(git ls-files | grep -E '(^|/)[.]env($|[.])|^[.]local/|^[.]vercel/|[.](pem|key|p12|pfx)$' | grep -vE '(^|/)[.]env[.]example$|^certs/supabase-root-2021[.]pem$' || true)"
if [ -n "$bad" ]; then
  echo "These files must never be committed:" >&2
  echo "$bad" >&2
  exit 1
fi
echo "check-tracked-files: nothing tracked that shouldn't be"
