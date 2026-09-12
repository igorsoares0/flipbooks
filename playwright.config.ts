import { defineConfig, devices } from "@playwright/test";
import { TEST_DATABASE_URL } from "./tests/reset-test-db";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

// Tests run against the production build by default, as the Next.js docs recommend.
// The dev server compiles routes on demand and can briefly 404 a route that is still
// compiling when many workers hit it at once. E2E_DEV=1 uses `next dev` for quick local loops.
const serverCommand = process.env.E2E_DEV
  ? `npm run dev -- --port ${PORT}`
  : `npm run build && npm run start -- --port ${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  // Each worker is a Chromium instance; more than ~4 starves a small machine (WSL defaults to
  // a few GB of RAM) and pages start stalling. E2E_WORKERS overrides.
  workers: Number(process.env.E2E_WORKERS) || (process.env.CI ? 2 : 4),
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        // Signed in as the demo user; specs that need another state override this.
        storageState: "e2e/.auth/marina.json",
      },
    },
  ],
  webServer: {
    command: serverCommand,
    url: baseURL,
    // Never reuse a running server: it could be pointed at the dev database.
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: "",
      BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET: "e2e-only-secret-not-used-anywhere-else-000000",
      // Share links keep the production host, as in the design.
      NEXT_PUBLIC_APP_URL: "https://flipbook.co",
      EMAIL_OUTBOX_DIR: ".emails-test",
      RESEND_API_KEY: "",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      // Many parallel sign-ins from one IP would trip the production rate limiter.
      AUTH_RATE_LIMIT: "off",
    },
  },
});
