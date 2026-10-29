import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations must bypass the transaction pooler, so prefer the direct URL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
