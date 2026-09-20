// A sliding-window limiter held in memory. That matches how the app is deployed today (one
// container, one worker); when there are several, this becomes per-instance and the spec's
// Redis step (§5.5) is the upgrade. Auth has its own limiter inside Better Auth.

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();
let lastSweep = 0;

/** Drops expired entries now and then, so the map can't grow forever. */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hit] of buckets) if (hit.resetAt <= now) buckets.delete(key);
}

/** Uploads cost storage and worker time, so they are capped per account, not per IP. */
export const UPLOADS_PER_HOUR = { limit: 30, windowMs: 60 * 60_000 };

export type RateLimit = { ok: boolean; remaining: number; retryAfterSeconds: number };

/**
 * Counts one hit against `key` (usually "bucket:ip" or "bucket:userId").
 * Returns whether it is within `limit` hits per `windowMs`.
 */
export function rateLimit(key: string, { limit, windowMs }: { limit: number; windowMs: number }, now = Date.now()): RateLimit {
  sweep(now);
  const hit = buckets.get(key);
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  hit.count += 1;
  return { ok: hit.count <= limit, remaining: Math.max(0, limit - hit.count), retryAfterSeconds: Math.max(1, Math.ceil((hit.resetAt - now) / 1000)) };
}

/** Test helper: forget every counter. */
export function resetRateLimits() {
  buckets.clear();
  lastSweep = 0;
}

/** The caller's IP, as far as the proxies in front of us report it. */
export function clientIp(headers: Headers) {
  return headers.get("cf-connecting-ip") || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
