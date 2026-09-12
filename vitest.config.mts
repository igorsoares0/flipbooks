import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://flipbook:flipbook@localhost:5433/flipbook_test";

// Integration tests use the local MinIO from docker-compose, in its own bucket.
const TEST_STORAGE = {
  S3_ENDPOINT: process.env.TEST_S3_ENDPOINT ?? "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_BUCKET: process.env.TEST_S3_BUCKET ?? "flipbook-test",
  S3_ACCESS_KEY_ID: "flipbook",
  S3_SECRET_ACCESS_KEY: "flipbook-secret",
  S3_FORCE_PATH_STYLE: "true",
};

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
          include: ["src/**/*.test.{ts,tsx}", "worker/**/*.test.ts"],
          exclude: ["**/*.integration.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.integration.test.ts", "worker/**/*.integration.test.ts"],
          // Resets and seeds flipbook_test once per run (needs `npm run db:up`).
          globalSetup: ["./tests/integration-setup.ts"],
          env: { DATABASE_URL: TEST_DATABASE_URL, TEST_DATABASE_URL, ...TEST_STORAGE, EMAIL_OUTBOX_DIR: ".emails-test" },
          // Rendering real PDFs takes a few seconds per test.
          testTimeout: 30_000,
          // One database, so files run one after another.
          fileParallelism: false,
        },
      },
    ],
  },
});
