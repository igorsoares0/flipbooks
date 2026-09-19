import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyPaddleSignature } from "./signature";

const NOW = Date.UTC(2026, 8, 19, 12, 0, 0);
const TS = NOW / 1000;
const sign = (body: string, secret = "secret", ts = TS) => `ts=${ts};h1=${createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex")}`;

describe("Paddle signatures", () => {
  it("accepts a fresh signature over the exact body", () => {
    expect(verifyPaddleSignature('{"a":1}', "secret", sign('{"a":1}'), NOW)).toBe(true);
  });

  it("rejects another secret, a changed body, an old timestamp and garbage", () => {
    expect(verifyPaddleSignature('{"a":1}', "secret", sign('{"a":1}', "other"), NOW)).toBe(false);
    expect(verifyPaddleSignature('{"a":2}', "secret", sign('{"a":1}'), NOW)).toBe(false);
    expect(verifyPaddleSignature('{"a":1}', "secret", sign('{"a":1}', "secret", TS - 60), NOW)).toBe(false);
    expect(verifyPaddleSignature('{"a":1}', "secret", "ts=abc;h1=zz", NOW)).toBe(false);
    expect(verifyPaddleSignature('{"a":1}', "secret", "", NOW)).toBe(false);
  });
});
