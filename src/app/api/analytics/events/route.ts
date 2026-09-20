import { countryFrom, eventBatchSchema, recordEvents } from "@/lib/analytics/ingest";
import { getOptionalUser } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Reader events from the viewer (navigator.sendBeacon). Public by design: it only ever
// appends events to published books, and always answers 204 so it reveals nothing.

const MAX_BODY_BYTES = 16 * 1024;
// A reader sends a batch every few seconds at most; anything above this is a script.
const LIMIT = { limit: 120, windowMs: 60_000 };

export async function POST(request: Request) {
  const done = new Response(null, { status: 204 });
  const ip = clientIp(request.headers);
  // Over the limit the batch is dropped, still answering 204: readers never see an error.
  if (!rateLimit(`events:${ip}`, LIMIT).ok) return done;
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return done;

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return done;
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return done;
  }
  const parsed = eventBatchSchema.safeParse(body);
  if (!parsed.success) return done;

  const viewer = await getOptionalUser();
  await recordEvents(parsed.data, {
    ip: ip === "unknown" ? null : ip,
    userAgent: request.headers.get("user-agent"),
    country: countryFrom(request.headers),
    viewerId: viewer?.id ?? null,
  });
  return done;
}
