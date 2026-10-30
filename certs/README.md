# Certificates

`supabase-root-2021.pem` is Supabase's public root CA, "Supabase Root 2021 CA" (`prod-ca-2021.crt`,
valid to 2031-04-26, SHA-256 `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`).
It is public, not a secret. It matches the root the Supabase pooler serves on ports 5432 and 6543.

The app reads it from `DATABASE_SSL_CA` (set in Vercel), not from this file. Local scripts that talk to
Supabase (`scripts/migrate-supabase.sh`) read this file. `.vercelignore` keeps `*.pem` out of deployments.
