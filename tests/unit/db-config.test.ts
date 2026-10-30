import { describe, expect, it } from "vitest";
import { poolConfig } from "@/lib/db-config";

const URL_ = "postgresql://u:p%40ss@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true";
const PEM = "-----BEGIN CERTIFICATE-----\\nMIIB\\n-----END CERTIFICATE-----";

describe("poolConfig", () => {
  it("passes the URL through untouched without a CA (local development)", () => {
    expect(poolConfig("postgresql://shabari@127.0.0.1:54329/sws_dev", undefined)).toEqual({ connectionString: "postgresql://shabari@127.0.0.1:54329/sws_dev" });
  });

  it("verifies against the provided CA and strips URL ssl params that would override it", () => {
    const cfg = poolConfig(URL_, PEM);
    expect(cfg.ssl).toEqual({ ca: "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----", rejectUnauthorized: true });
    const url = new URL(cfg.connectionString!);
    expect(url.searchParams.has("sslmode")).toBe(false);
    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.password).toBe("p%40ss");
  });

  it("refuses a remote database without the CA, whatever the URL says", () => {
    for (const q of ["", "?sslmode=require", "?sslmode=disable", "?uselibpqcompat=true&sslmode=require", "?ssl=0"]) {
      expect(() => poolConfig(`postgresql://u:p@aws-0-us-east-1.pooler.supabase.com:6543/postgres${q}`, undefined)).toThrow(/DATABASE_SSL_CA/);
    }
    expect(() => poolConfig("postgresql://u:p@db.oxihkuivrwnwlrsolwzx.supabase.co:5432/postgres", "")).toThrow(/DATABASE_SSL_CA/);
  });

  it("allows local Postgres without TLS", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) expect(poolConfig(`postgresql://u@${host}:5432/sws_test`, undefined).ssl).toBeUndefined();
  });

  it("strips every URL parameter that could weaken or disable verification", () => {
    const cfg = poolConfig(`${URL_}&ssl=0&sslnegotiation=direct&uselibpqcompat=true&sslrootcert=/tmp/x`, PEM);
    const params = [...new URL(cfg.connectionString!).searchParams.keys()];
    expect(params).toEqual(["pgbouncer"]);
    expect(cfg.ssl).toMatchObject({ rejectUnauthorized: true });
  });
});
