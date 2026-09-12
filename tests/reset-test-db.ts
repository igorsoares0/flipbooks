import { execFileSync } from "node:child_process";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://flipbook:flipbook@localhost:5433/flipbook_test";

/** Drops and re-migrates the test database, then loads the demo seed. */
export function resetTestDatabase() {
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: "" };
  const run = (...args: string[]) => execFileSync("npx", args, { env, stdio: "pipe" });
  try {
    run("prisma", "migrate", "reset", "--force");
    run("tsx", "prisma/seed.ts");
  } catch (error) {
    const output = (error as { stderr?: Buffer; stdout?: Buffer }).stderr?.toString() || String(error);
    throw new Error(`Could not reset the test database. Is Postgres running (npm run db:up)?\n${output}`);
  }
}
