import { afterAll, describe, expect, it } from "vitest";
import { db } from "../support/db";

// Supabase's Data API reads tables as the `anon` / `authenticated` roles.
// Every table must have RLS on so those roles see nothing.
describe("row-level security", () => {
  afterAll(async () => {
    await db.$executeRawUnsafe(`DROP OWNED BY rls_probe; DROP ROLE IF EXISTS rls_probe`).catch(() => {});
  });

  it("is enabled on every table in public", async () => {
    const rows = await db.$queryRaw<{ relname: string; relrowsecurity: boolean }[]>`
      SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'`;
    expect(rows.length).toBeGreaterThan(20);
    expect(rows.filter((r) => !r.relrowsecurity).map((r) => r.relname)).toEqual([]);
  });

  it("blocks a non-owner role even when it holds SELECT grants", async () => {
    await db.user.create({ data: { email: "rls@example.com", passwordHash: "x" } });
    await db.$executeRawUnsafe(`DROP ROLE IF EXISTS rls_probe`);
    await db.$executeRawUnsafe(`CREATE ROLE rls_probe NOLOGIN`);
    await db.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO rls_probe`);
    await db.$executeRawUnsafe(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO rls_probe`);
    const visible = await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE rls_probe`);
      return tx.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "User"`;
    });
    expect(Number(visible[0].n)).toBe(0);
    expect(await db.user.count()).toBeGreaterThan(0);
  });
});
