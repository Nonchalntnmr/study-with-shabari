// Validate and import a lesson file as an unpublished draft (status REVIEW).
//   npx tsx scripts/import-lesson.ts content/lessons/dopamine.json [--dry-run]
// Re-importing replaces the draft's text and clears earlier review stamps; the
// published version students see is unchanged until an admin approves again.

import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { poolConfig } from "../src/lib/db-config";
import { LessonValidationError, importLesson, parseLessonFile } from "../src/lib/lessons/import";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) throw new Error("usage: npx tsx scripts/import-lesson.ts <lesson.json> [--dry-run]");
  const json = JSON.parse(readFileSync(file, "utf8"));
  if (args.includes("--dry-run")) {
    const l = parseLessonFile(json);
    console.log(`valid: ${l.lesson.slug}, ${l.steps.length} steps, ${l.questions.length} questions, ${l.misconceptions.length} misconceptions`);
    return;
  }
  const db = new PrismaClient({ adapter: new PrismaPg(poolConfig(process.env.DATABASE_URL!)) });
  try {
    console.log(await importLesson(db, json));
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  if (e instanceof LessonValidationError) console.error(e.issues.join("\n"));
  else console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
