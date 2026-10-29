// Seeds founder-provided pricing, resource placeholders and the sample bank.
//   npx prisma db seed                      → sample sets land in REVIEW for Shabari to approve
//   npx prisma db seed -- --publish-samples → sample sets are PUBLISHED (dev/test)
// Never creates users. Use `npm run admin:create` for the admin account.

import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { importBank } from "../src/lib/content/import";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const publishSamples = process.argv.includes("--publish-samples");

async function main() {
  const bank = JSON.parse(readFileSync(path.join(process.cwd(), "content/samples/sample-bank.json"), "utf8"));
  const summary = await importBank(db, bank, publishSamples ? "PUBLISHED" : "REVIEW");
  console.log("sample bank:", summary);

  // Pricing exactly as provided in the brief. Package contents await founder confirmation.
  const plans = [
    {
      slug: "consult",
      name: "Free consultation",
      priceLabel: "$0",
      detail: "15 minutes on Zoom",
      features: [
        "Talk through your timeline, scores and weak spots",
        "Leave with a next step, whether or not we work together",
      ],
      note: null,
      ctaLabel: "Book a free call",
      ctaHref: "/book",
      featured: false,
      position: 0,
    },
    {
      slug: "full-mcat-package",
      name: "Full MCAT package",
      priceLabel: "$2,000",
      detail: null,
      features: [
        "10 live 1:1 sessions",
        "2 original full-length practice exams",
        "2,000 original practice questions with explanations",
        "A study plan built around your test date",
      ],
      note: "Package details are confirmed on your free consultation.",
      ctaLabel: "Start with a free call",
      ctaHref: "/book",
      featured: true,
      position: 1,
    },
    {
      slug: "custom-plan",
      name: "Custom plan",
      priceLabel: "Let’s talk",
      detail: "Pricing after consultation",
      features: [
        "Just one section, or just a few sessions",
        "Targeted question sets for your weak areas",
        "College application help, too",
      ],
      note: null,
      ctaLabel: "Ask on a call",
      ctaHref: "/book",
      featured: false,
      position: 2,
    },
  ];
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
