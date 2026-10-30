import type { PoolConfig } from "pg";

// node-postgres treats sslmode=require as full verification, and Supabase's pooler
// certificate chains to Supabase's own root CA, which isn't in Node's trust store.
// With DATABASE_SSL_CA (the PEM from Supabase → Database → SSL configuration) the
// server is verified against that CA. The URL's ssl* parameters are dropped because
// node-postgres would otherwise let them override this config (ssl=0 even turns TLS off).
const SSL_PARAMS = ["ssl", "sslmode", "sslrootcert", "sslcert", "sslkey", "sslnegotiation", "uselibpqcompat"];

// Local Postgres (development, tests, CI) runs without TLS. Any other host must be verified:
// without the CA, node-postgres would connect unverified, or in plaintext if the URL has no sslmode.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function poolConfig(connectionString: string, caPem = process.env.DATABASE_SSL_CA): PoolConfig {
  const url = new URL(connectionString);
  if (!caPem) {
    if (LOCAL_HOSTS.has(url.hostname)) return { connectionString };
    throw new Error(`Refusing to connect to ${url.hostname} without DATABASE_SSL_CA: the server's certificate couldn't be verified.`);
  }
  for (const k of SSL_PARAMS) url.searchParams.delete(k);
  return { connectionString: url.toString(), ssl: { ca: caPem.replace(/\\n/g, "\n"), rejectUnauthorized: true } };
}
