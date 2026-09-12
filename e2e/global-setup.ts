import { rm } from "node:fs/promises";
import { deletePrefix } from "../src/lib/storage/s3";
import { resetTestDatabase } from "../tests/reset-test-db";
import { EMAIL_OUTBOX_DIR } from "./db";

// Fresh test database, empty test bucket and empty email outbox before the servers start.
export default async function globalSetup() {
  resetTestDatabase();
  await rm(EMAIL_OUTBOX_DIR, { recursive: true, force: true });

  // The storage module reads its settings on first use, so point it at the test bucket here.
  Object.assign(process.env, {
    S3_ENDPOINT: process.env.TEST_S3_ENDPOINT ?? "http://localhost:9000",
    S3_REGION: "us-east-1",
    S3_BUCKET: process.env.TEST_S3_BUCKET ?? "flipbook-test",
    S3_ACCESS_KEY_ID: "flipbook",
    S3_SECRET_ACCESS_KEY: "flipbook-secret",
    S3_FORCE_PATH_STYLE: "true",
  });
  await deletePrefix("flipbooks/");
}
