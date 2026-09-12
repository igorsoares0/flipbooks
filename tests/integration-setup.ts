import { resetTestDatabase } from "./reset-test-db";

export default async function setup() {
  resetTestDatabase();

  // Empty the test bucket too (global setup runs outside the test env, so set storage here).
  Object.assign(process.env, {
    S3_ENDPOINT: process.env.TEST_S3_ENDPOINT ?? "http://localhost:9000",
    S3_REGION: "us-east-1",
    S3_BUCKET: process.env.TEST_S3_BUCKET ?? "flipbook-test",
    S3_ACCESS_KEY_ID: "flipbook",
    S3_SECRET_ACCESS_KEY: "flipbook-secret",
    S3_FORCE_PATH_STYLE: "true",
  });
  const { deletePrefix } = await import("../src/lib/storage/s3");
  await deletePrefix("flipbooks/");
}
