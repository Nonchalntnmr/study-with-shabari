// Writes the founder's MCAT packages (src/lib/pricing-plans.ts) to the pricing table, and
// unpublishes (DRAFT, never deletes) any published plan that isn't one of them.
//   DATABASE_URL=… DATABASE_SSL_CA=… npx tsx scripts/sync-mcat-pricing.ts           # dry run
//   DATABASE_URL=… DATABASE_SSL_CA=… npx tsx scripts/sync-mcat-pricing.ts --apply   # write
// Connects through src/lib/db-config.ts, so a remote database is verified against the CA.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { poolConfig } from "../src/lib/db-config";
import { mcatPlanRows } from "../src/lib/pricing-plans";

async function main() {
  const apply = process.argv.includes("--apply");
  const db = new PrismaClient({ adapter: new PrismaPg(poolConfig(process.env.DATABASE_URL!)) });
  try {
    const before = await db.pricingPlan.findMany({ select: { slug: true, name: true, priceLabel: true, status: true }, orderBy: { position: "asc" } });
    console.log("before:", before.map((p) => `${p.slug} ${p.status} ${p.priceLabel}`).join(" | ") || "(none)");
    const keep = new Set(mcatPlanRows.map((p) => p.slug));
    const retire = before.filter((p) => !keep.has(p.slug) && p.status === "PUBLISHED").map((p) => p.slug);
    console.log("upsert:", mcatPlanRows.map((p) => `${p.slug} ${p.priceLabel}`).join(" | "));
    console.log("unpublish:", retire.join(", ") || "(none)");
    if (!apply) {
      console.log("dry run: nothing written. Re-run with --apply.");
      return;
    }
    await db.$transaction([
      ...mcatPlanRows.map((p) =>
        db.pricingPlan.upsert({ where: { slug: p.slug }, create: { ...p, status: "PUBLISHED" }, update: { ...p, status: "PUBLISHED" } }),
      ),
      ...(retire.length ? [db.pricingPlan.updateMany({ where: { slug: { in: retire } }, data: { status: "DRAFT" } })] : []),
    ]);
    const after = await db.pricingPlan.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, priceLabel: true }, orderBy: { position: "asc" } });
    console.log("published now:", after.map((p) => `${p.slug} ${p.priceLabel}`).join(" | "));
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(String(e?.message ?? e).replace(/postgres(ql)?:\/\/\S+/g, "<redacted>"));
  process.exit(1);
});
