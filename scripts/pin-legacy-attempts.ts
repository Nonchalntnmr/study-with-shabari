// Pin attempts created before question versioning to their current content, so editing a
// published question can never change their results or review. Idempotent; run once after
// `prisma migrate deploy` adds the versions table.
//   DATABASE_URL=... npx tsx scripts/pin-legacy-attempts.ts

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { poolConfig } from "../src/lib/db-config";
import { pinLegacyAttempts } from "../src/lib/exam/versions";

async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg(poolConfig(process.env.DATABASE_URL!)) });
  try {
    console.log(await pinLegacyAttempts(db));
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
