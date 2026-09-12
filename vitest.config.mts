import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://flipbook:flipbook@localhost:5433/flipbook_test";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Next swaps `server-only` for an empty module at build time; do the same under test.
      "server-only": fileURLToPath(new URL("./node_modules/next/dist/compiled/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    setupFiles: ["./vitest.setup.ts"],
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          // Logic tests run in Node; component tests opt into jsdom with a `@vitest-environment jsdom` comment.
          environment: "node",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/**/*.integration.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.integration.test.ts"],
          // Resets and seeds flipbook_test once per run (needs `npm run db:up`).
          globalSetup: ["./tests/integration-setup.ts"],
          env: { DATABASE_URL: TEST_DATABASE_URL, TEST_DATABASE_URL },
          // One database, so files run one after another.
          fileParallelism: false,
        },
      },
    ],
  },
});
