import { createHmac, timingSafeEqual } from "node:crypto";

// Paddle signs each notification: header `Paddle-Signature: ts=<unix seconds>;h1=<hex>`,
// where h1 = HMAC-SHA256(secret, "<ts>:<raw body>"). Checked here directly (the SDK's
// helper needs its full client to be constructed first).

/** How old a signature may be, in seconds. Paddle's own SDK allows 5. */
export const SIGNATURE_TOLERANCE_SECONDS = 5;

export function verifyPaddleSignature(rawBody: string, secret: string, header: string, now = Date.now()) {
  const parts = Object.fromEntries(
    header.split(";").map((part) => {
      const [key, ...value] = part.split("=");
      return [key?.trim(), value.join("=").trim()];
    }),
  );
  const ts = Number(parts.ts);
  const h1 = parts.h1;
  if (!Number.isInteger(ts) || !h1 || !/^[0-9a-f]+$/i.test(h1)) return false;
  if (Math.abs(now / 1000 - ts) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest();
  const given = Buffer.from(h1, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
