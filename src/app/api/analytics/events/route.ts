import { getOptionalUser } from "@/lib/auth/session";
import { countryFrom, eventBatchSchema, recordEvents } from "@/lib/analytics/ingest";

// Reader events from the viewer (navigator.sendBeacon). Public by design: it only ever
// appends events to published books, and always answers 204 so it reveals nothing.

const MAX_BODY_BYTES = 16 * 1024;

function clientIp(headers: Headers) {
  return headers.get("cf-connecting-ip") || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || null;
}

export async function POST(request: Request) {
  const done = new Response(null, { status: 204 });
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
    ip: clientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
    country: countryFrom(request.headers),
    viewerId: viewer?.id ?? null,
  });
  return done;
}
