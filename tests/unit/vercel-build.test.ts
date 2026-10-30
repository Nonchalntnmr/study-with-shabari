import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// scripts/vercel-build.sh with a stand-in npx that records what it was asked to run.
function build(env: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), "vercel-build-"));
  const log = join(dir, "npx.log");
  writeFileSync(join(dir, "npx"), `#!/usr/bin/env bash\necho "$*" >> "${log}"\n`);
  chmodSync(join(dir, "npx"), 0o755);
  const r = spawnSync("bash", ["scripts/vercel-build.sh"], { env: { PATH: `${dir}:/usr/bin:/bin`, NODE_ENV: "test", ...env }, encoding: "utf8" });
  let ran: string[] = [];
  try {
    ran = readFileSync(log, "utf8").trim().split("\n");
  } catch {}
  return { status: r.status, stderr: r.stderr, ran };
}

const PROD_POOLER = "postgresql://postgres.oxihkuivrwnwlrsolwzx:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
const PROD_DIRECT = "postgresql://postgres:pw@db.oxihkuivrwnwlrsolwzx.supabase.co:5432/postgres";
const STAGING = "postgresql://postgres.stagingref000000000:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

describe("vercel-build.sh", () => {
  it("refuses to migrate a preview build that points at the production database", () => {
    const cases: Record<string, string>[] = [{ DATABASE_URL: PROD_POOLER }, { DATABASE_URL: STAGING, DIRECT_URL: PROD_DIRECT }];
    for (const env of cases) {
      const r = build({ VERCEL_ENV: "preview", MIGRATE_ON_BUILD: "1", ...env });
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/refusing to migrate/);
      expect(r.ran).toEqual([]);
    }
  });

  it("migrates a preview build on the staging database, and production as before", () => {
    expect(build({ VERCEL_ENV: "preview", MIGRATE_ON_BUILD: "1", DATABASE_URL: STAGING, DIRECT_URL: STAGING }).ran).toEqual(["prisma generate", "prisma migrate deploy", "next build"]);
    expect(build({ VERCEL_ENV: "production", DATABASE_URL: PROD_POOLER, DIRECT_URL: PROD_DIRECT }).ran).toEqual(["prisma generate", "prisma migrate deploy", "next build"]);
  });

  it("never migrates a preview build that hasn't opted in", () => {
    expect(build({ VERCEL_ENV: "preview", DATABASE_URL: PROD_POOLER }).ran).toEqual(["prisma generate", "prisma migrate status", "next build"]);
  });
});
