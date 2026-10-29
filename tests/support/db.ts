import { readFileSync } from "node:fs";
import { db } from "@/lib/db";
import { importBank } from "@/lib/content/import";

export { db };

/** Delete everything except migrations history, children before parents. */
export async function resetData() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

export function sampleBank() {
  return JSON.parse(readFileSync("content/samples/sample-bank.json", "utf8"));
}

export async function seedSampleBank(status: "DRAFT" | "REVIEW" | "PUBLISHED" = "PUBLISHED") {
  return importBank(db, sampleBank(), status);
}
