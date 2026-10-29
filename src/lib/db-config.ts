import type { PoolConfig } from "pg";

// node-postgres treats sslmode=require as full verification, and Supabase's pooler
// certificate chains to Supabase's own root CA, which isn't in Node's trust store.
// With DATABASE_SSL_CA (the PEM from Supabase → Database → SSL configuration) the
// server is verified against that CA. The URL's ssl* parameters are dropped because
// node-postgres would otherwise let them override this config.
const SSL_PARAMS = ["sslmode", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"];

export function poolConfig(connectionString: string, caPem = process.env.DATABASE_SSL_CA): PoolConfig {
  if (!caPem) return { connectionString };
  const url = new URL(connectionString);
  for (const k of SSL_PARAMS) url.searchParams.delete(k);
  return { connectionString: url.toString(), ssl: { ca: caPem.replace(/\\n/g, "\n"), rejectUnauthorized: true } };
}
