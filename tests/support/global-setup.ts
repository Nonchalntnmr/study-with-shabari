import { execFileSync } from "node:child_process";
import { Client } from "pg";
import { testDatabaseUrl } from "./test-db-url";

// Wipe the test database and apply every migration from scratch, exactly as production would.
export default async function setup() {
  const url = testDatabaseUrl();
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await client.end();
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: "pipe",
  });
}
