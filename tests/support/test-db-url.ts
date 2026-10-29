import "dotenv/config";

/** The integration database. Refuses anything that isn't clearly a test database. */
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!/test/i.test(name)) throw new Error(`Refusing to run integration tests against database "${name}"`);
  return url;
}
