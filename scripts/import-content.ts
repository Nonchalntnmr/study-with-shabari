// Validate and import a question bank file.
//   npm run content:import -- path/to/bank.json [--status DRAFT|REVIEW|PUBLISHED] [--dry-run]

import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { poolConfig } from "../src/lib/db-config";
import type { ContentStatus } from "../src/generated/prisma/enums";
import { ImportValidationError, importBank, parseBank } from "../src/lib/content/import";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--status");
  if (!file) throw new Error("usage: npm run content:import -- <file.json> [--status DRAFT|REVIEW|PUBLISHED] [--dry-run]");
  const statusArg = args.includes("--status") ? args[args.indexOf("--status") + 1] : "DRAFT";
  if (!["DRAFT", "REVIEW", "PUBLISHED"].includes(statusArg)) throw new Error(`invalid --status ${statusArg}`);

  const json = JSON.parse(readFileSync(file, "utf8"));
  if (args.includes("--dry-run")) {
    const bank = parseBank(json);
    const questions = bank.exams.flatMap((e) => e.items.flatMap((i) => (i.type === "passage" ? i.questions : [i])));
    console.log(`valid: ${bank.exams.length} exams, ${questions.length} questions, ${bank.topics.length} topics`);
    return;
  }

  const db = new PrismaClient({ adapter: new PrismaPg(poolConfig(process.env.DATABASE_URL!)) });
  try {
    console.log(await importBank(db, json, statusArg as ContentStatus));
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  if (e instanceof ImportValidationError) console.error(e.issues.join("\n"));
  else console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
