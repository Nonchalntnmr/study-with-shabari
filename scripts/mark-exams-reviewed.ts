// Records Shabari's review of whole practice sets (src/lib/content/review.ts), with an AuditLog row per set.
//   DATABASE_URL=… DATABASE_SSL_CA=… npx tsx scripts/mark-exams-reviewed.ts --actor <admin email> fl1-cp fl1-bb fl1-ps           # dry run
//   DATABASE_URL=… DATABASE_SSL_CA=… npx tsx scripts/mark-exams-reviewed.ts --actor <admin email> fl1-cp fl1-bb fl1-ps --apply   # write
// The actor must be an existing admin. Connects through src/lib/db-config.ts, so a remote database is verified against the CA.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { markExamsReviewed } from "../src/lib/content/review";
import { poolConfig } from "../src/lib/db-config";

const NOTE = "Shabari reviewed every question, answer key and explanation (relayed by Nishanth, 2026-10-30 05:56).";

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const email = args.includes("--actor") ? args[args.indexOf("--actor") + 1] : undefined;
  const slugs = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--actor");
  if (!email || !slugs.length) throw new Error("usage: npx tsx scripts/mark-exams-reviewed.ts --actor <admin email> <exam slug>… [--apply]");

  const db = new PrismaClient({ adapter: new PrismaPg(poolConfig(process.env.DATABASE_URL!)) });
  try {
    const actor = await db.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true, email: true, role: true } });
    if (!actor || actor.role !== "ADMIN") throw new Error(`${email} isn't an admin account`);
    const before = await db.exam.findMany({ where: { slug: { in: slugs } }, select: { slug: true, status: true, underReview: true, _count: { select: { items: true } } } });
    console.log("before:", before.map((e) => `${e.slug} ${e.status} underReview=${e.underReview} questions=${e._count.items}`).join(" | ") || "(none)");
    if (!apply) {
      console.log("dry run: nothing written. Re-run with --apply.");
      return;
    }
    console.log("marked:", JSON.stringify(await markExamsReviewed(db, slugs, actor, NOTE)));
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(String(e?.message ?? e).replace(/postgres(ql)?:\/\/\S+/g, "<redacted>"));
  process.exit(1);
});
