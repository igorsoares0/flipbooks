import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js reads .env.local on its own; the Prisma CLI needs it loaded explicitly.
// Variables already set in the environment (CI, test scripts) win over the file.
config({ path: ".env.local", quiet: true });

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
