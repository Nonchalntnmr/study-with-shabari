// E2E fixture: approve and publish a lesson's AI drafts IN A LOCAL TEST DATABASE ONLY,
// through the same rules and audit trail as the admin "Approve and publish" button.
//   npx tsx scripts/publish-lesson-fixture.ts dopamine admin@e2e.test
// Refuses unless DATABASE_URL is on localhost and the database name contains "e2e" or "test".

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { publishLesson } from "../src/lib/lessons/publish";

export function isLocalTestDatabase(url: string): boolean {
  try {
    const u = new URL(url);
    return ["127.0.0.1", "localhost", "::1", "[::1]"].includes(u.hostname) && /e2e|test/i.test(u.pathname.replace(/^\//, ""));
  } catch {
    return false;
  }
}

async function main() {
  const [slug, adminEmail] = process.argv.slice(2);
  if (!slug || !adminEmail) throw new Error("usage: npx tsx scripts/publish-lesson-fixture.ts <lesson-slug> <admin-email>");
  const url = process.env.DATABASE_URL ?? "";
  if (!isLocalTestDatabase(url)) throw new Error("refusing: this fixture only publishes into a local e2e/test database");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const lesson = await db.lesson.findUniqueOrThrow({ where: { slug } });
    const admin = await db.user.findUniqueOrThrow({ where: { email: adminEmail.toLowerCase() } });
    const result = await publishLesson(db, lesson.id, { id: admin.id, email: admin.email, role: admin.role }, true);
    if (!result.ok) throw new Error(`not published:\n${result.problems.join("\n")}`);
    console.log(`published ${slug} v${result.version} in the test database`);
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1]?.endsWith("publish-lesson-fixture.ts")) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
