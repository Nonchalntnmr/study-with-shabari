import "dotenv/config";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { defineConfig } from "prisma/config";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

// Migrations connect through Prisma's schema engine, not node-postgres (src/lib/db-config.ts), so
// the CA travels as a file: sslcert names the trusted root and sslaccept=strict makes a certificate
// that doesn't chain to it, or doesn't match the host, fatal. Local Postgres has no TLS. Any other
// host without DATABASE_SSL_CA is refused rather than connected to unverified.
// macOS can't run these: its trust policy rejects Supabase's five-year pooler certificate, so
// Supabase migrations run in the production build on Vercel (Linux), as scripts/vercel-build.sh does.
function datasourceUrl(): string | undefined {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) return undefined;
  const u = new URL(url);
  if (LOCAL_HOSTS.has(u.hostname)) return url;
  const ca = process.env.DATABASE_SSL_CA;
  if (!ca) throw new Error(`Refusing to connect to ${u.hostname} without DATABASE_SSL_CA: the server's certificate couldn't be verified.`);
  const file = path.join(tmpdir(), "study-with-shabari-db-ca.pem");
  writeFileSync(file, ca.replace(/\\n/g, "\n"));
  for (const k of ["ssl", "sslmode", "sslrootcert", "sslcert", "sslkey", "sslaccept", "sslnegotiation", "uselibpqcompat"]) u.searchParams.delete(k);
  u.searchParams.set("sslmode", "require");
  u.searchParams.set("sslcert", file);
  u.searchParams.set("sslaccept", "strict");
  return u.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: datasourceUrl(),
  },
});
