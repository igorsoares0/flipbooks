import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientIp, rateLimit, resetRateLimits } from "./rate-limit";

const window = { limit: 3, windowMs: 60_000 };

describe("rate limit", () => {
  beforeEach(resetRateLimits);

  it("allows up to the limit, then refuses until the window ends", () => {
    const now = 1_000_000;
    expect([1, 2, 3].map(() => rateLimit("uploads:a", window, now).ok)).toEqual([true, true, true]);
    const refused = rateLimit("uploads:a", window, now);
    expect(refused).toMatchObject({ ok: false, remaining: 0, retryAfterSeconds: 60 });
    expect(rateLimit("uploads:a", window, now + 59_000).ok).toBe(false);
    expect(rateLimit("uploads:a", window, now + 60_001).ok).toBe(true);
  });

  it("counts each key on its own", () => {
    const now = 2_000_000;
    for (let i = 0; i < 3; i++) rateLimit("uploads:a", window, now);
    expect(rateLimit("uploads:a", window, now).ok).toBe(false);
    expect(rateLimit("uploads:b", window, now).ok).toBe(true);
    expect(rateLimit("events:a", window, now).ok).toBe(true);
  });

  describe("client IP", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("reads the address the nearest proxy added to X-Forwarded-For", () => {
      expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.9" }))).toBe("198.51.100.9");
      // Earlier entries come from the client, so they can't pick their own bucket.
      expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.77, 198.51.100.9" }))).toBe("198.51.100.9");
      expect(clientIp(new Headers())).toBe("unknown");
    });

    it("ignores headers the client can send itself", () => {
      const headers = new Headers({ "cf-connecting-ip": "203.0.113.1", "x-real-ip": "203.0.113.2", "x-forwarded-for": "198.51.100.9" });
      expect(clientIp(headers)).toBe("198.51.100.9");
    });

    it("uses the header set in CLIENT_IP_HEADER", () => {
      vi.stubEnv("CLIENT_IP_HEADER", "CF-Connecting-IP");
      expect(clientIp(new Headers({ "cf-connecting-ip": "203.0.113.1", "x-forwarded-for": "198.51.100.9" }))).toBe("203.0.113.1");
      expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.9" }))).toBe("unknown");
    });
  });
});
