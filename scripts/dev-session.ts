// Local development only: mint a session for an existing user so scripted smoke
// checks (curl) can load signed-in pages. Refuses to touch a non-local database.
//   npx tsx scripts/dev-session.ts admin@studywithshabari.local
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { poolConfig } from "../src/lib/db-config";
import { randomToken, sha256 } from "../src/lib/security/hash";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const host = new URL(url).hostname;
  if (process.env.NODE_ENV === "production" || !["127.0.0.1", "localhost"].includes(host)) {
    throw new Error(`Refusing: dev-session only runs against a local database (got ${host}).`);
  }
  const email = (process.argv[2] ?? "").toLowerCase();
  const db = new PrismaClient({ adapter: new PrismaPg(poolConfig(url)) });
  try {
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    const token = randomToken();
    await db.session.create({
      data: { userId: user.id, tokenHash: sha256(token), userAgent: "dev-session script", expiresAt: new Date(Date.now() + 3_600_000) },
    });
    process.stdout.write(token);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
