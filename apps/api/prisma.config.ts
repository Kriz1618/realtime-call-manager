import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// pnpm scripts run from apps/api; the shared .env lives at the repo root.
config({ path: "../../.env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
