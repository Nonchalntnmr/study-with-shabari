import { testDatabaseUrl } from "./test-db-url";

// Must run before src/lib/db.ts is imported so the client binds to the test database.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.AUTH_SECRET ||= "integration-test-secret-integration-test-secret";
