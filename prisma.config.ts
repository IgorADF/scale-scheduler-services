import "dotenv/config";
import process from "node:process";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "src/core/db/schema.prisma",
  migrations: {
    path: "src/core/db/migrations",
    seed: "tsx src/core/db/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
