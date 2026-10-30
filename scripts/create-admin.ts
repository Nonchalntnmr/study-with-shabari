// Create or promote the admin account.
//   ADMIN_PASSWORD='…' npm run admin:create -- shabari@example.com "Shabari Shankar"
// Without ADMIN_PASSWORD you are prompted (input hidden). Existing users are
// promoted to ADMIN; their password changes only if one is supplied.

import "dotenv/config";
import { createInterface } from "node:readline";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { poolConfig } from "../src/lib/db-config";
import { PASSWORD_MIN_LENGTH, hashPassword } from "../src/lib/auth/password";

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s) => {
      if (s.startsWith(question)) write.call(rl, s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const [emailArg, name] = process.argv.slice(2);
  if (!emailArg) throw new Error('usage: npm run admin:create -- <email> ["Full Name"]');
  const email = emailArg.trim().toLowerCase();

  const db = new PrismaClient({ adapter: new PrismaPg(poolConfig(process.env.DATABASE_URL!)) });
  try {
    const existing = await db.user.findUnique({ where: { email } });
    let password = process.env.ADMIN_PASSWORD;
    if (!password && !existing) password = await promptHidden(`Password for ${email}: `);
    if (password !== undefined && password.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
    }

    const passwordHash = password ? await hashPassword(password) : undefined;
    const user = await db.user.upsert({
      where: { email },
      create: { email, name: name ?? null, role: "ADMIN", passwordHash: passwordHash! },
      update: { role: "ADMIN", ...(name ? { name } : {}), ...(passwordHash ? { passwordHash } : {}) },
    });
    await db.auditLog.create({
      data: { action: existing ? "user.promote_admin" : "user.create_admin", entityType: "User", entityId: user.id, actorEmail: "cli" },
    });
    console.log(`${existing ? "Promoted" : "Created"} admin ${email}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
