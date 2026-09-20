import { describe, expect, it, beforeEach } from "vitest";
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

  it("reads the client IP from the usual proxy headers", () => {
    expect(clientIp(new Headers({ "cf-connecting-ip": "203.0.113.1", "x-forwarded-for": "198.51.100.9" }))).toBe("203.0.113.1");
    expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.9, 10.0.0.1" }))).toBe("198.51.100.9");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.3" }))).toBe("198.51.100.3");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
