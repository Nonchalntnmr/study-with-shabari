// Seeds founder-provided pricing, resource placeholders, the sample bank and the lessons.
//   npx prisma db seed                      → sample sets land in REVIEW for Shabari to approve
//   npx prisma db seed -- --publish-samples → sample sets are PUBLISHED (dev/test)
// Never creates users. Use `npm run admin:create` for the admin account.

import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { poolConfig } from "../src/lib/db-config";
import { mcatPlanRows } from "../src/lib/pricing-plans";
import { importBank } from "../src/lib/content/import";
import { importLesson } from "../src/lib/lessons/import";

const db = new PrismaClient({ adapter: new PrismaPg(poolConfig(process.env.DATABASE_URL!)) });
const publishSamples = process.argv.includes("--publish-samples");

async function main() {
  const bank = JSON.parse(readFileSync(path.join(process.cwd(), "content/samples/sample-bank.json"), "utf8"));
  const summary = await importBank(db, bank, publishSamples ? "PUBLISHED" : "REVIEW");
  console.log("sample bank:", summary);

  // Lessons arrive as unpublished drafts (REVIEW) and only an admin's approval publishes them.
  // Existing lessons are left alone so edits made in /admin/lessons survive a re-seed.
  for (const file of ["dopamine.json"]) {
    const json = JSON.parse(readFileSync(path.join(process.cwd(), "content/lessons", file), "utf8"));
    if (await db.lesson.findUnique({ where: { slug: json.lesson.slug } })) continue;
    console.log(`lesson ${json.lesson.slug}:`, await importLesson(db, json));
  }

  // MCAT pricing from the founder's 2026-10-30 packages (src/lib/pricing-plans.ts).
  const plans = mcatPlanRows;
  for (const plan of plans) {
    await db.pricingPlan.upsert({
      where: { slug: plan.slug },
      create: { ...plan, status: "PUBLISHED" },
      update: {}, // never overwrite edits made in the admin dashboard
    });
  }

  // The original site's note docs had placeholder links; URLs are added in /admin/resources.
  const notes = [
    { slug: "cp-content-review", title: "Chem/Phys content review", section: "CP" as const, description: "Gen chem, orgo, physics and biochem, typed up from my handwritten notes." },
    { slug: "bb-content-review", title: "Bio/Biochem content review", section: "BB" as const, description: "Cell bio, physiology, genetics and biochem pathways." },
    { slug: "ps-content-review", title: "Psych/Soc content review", section: "PS" as const, description: "Every term you’ll need, organized so it actually sticks." },
  ];
  for (const [i, n] of notes.entries()) {
    await db.resource.upsert({
      where: { slug: n.slug },
      create: { ...n, kind: "NOTES", url: null, position: i, status: "PUBLISHED" },
      update: {},
    });
  }

  const exams = await db.exam.findMany({ where: { isSample: true }, select: { id: true, slug: true, title: true, section: true, description: true } });
  for (const [i, e] of exams.entries()) {
    await db.resource.upsert({
      where: { slug: `practice-${e.slug}` },
      create: {
        slug: `practice-${e.slug}`,
        title: e.title,
        description: e.description,
        kind: "PRACTICE_SET",
        section: e.section,
        examId: e.id,
        position: 10 + i,
        status: publishSamples ? "PUBLISHED" : "REVIEW",
      },
      update: {},
    });
  }
  console.log(`pricing plans: ${plans.length}, note resources: ${notes.length}, practice resources: ${exams.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
