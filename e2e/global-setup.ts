import { rm } from "node:fs/promises";
import { resetTestDatabase } from "../tests/reset-test-db";
import { EMAIL_OUTBOX_DIR } from "./db";

// Fresh test database and empty email outbox before the server starts.
export default async function globalSetup() {
  resetTestDatabase();
  await rm(EMAIL_OUTBOX_DIR, { recursive: true, force: true });
}
