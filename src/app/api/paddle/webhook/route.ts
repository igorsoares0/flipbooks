import { verifyPaddleSignature } from "@/lib/billing/signature";
import { handlePaddleNotification, type PaddleNotification } from "@/lib/billing/webhooks";

// Paddle notifications (subscription lifecycle). The signature over the raw body is the
// only authentication, so nothing is parsed before it has been checked.

export async function POST(request: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return new Response("Billing is not configured", { status: 503 });

  const signature = request.headers.get("paddle-signature") ?? "";
  const body = await request.text();
  if (!verifyPaddleSignature(body, secret, signature)) return new Response("Invalid signature", { status: 401 });

  let event: PaddleNotification;
  try {
    event = JSON.parse(body) as PaddleNotification;
  } catch {
    return new Response("Invalid body", { status: 400 });
  }
  if (!event.event_id || !event.event_type || !event.occurred_at) return new Response("Invalid event", { status: 400 });

  const result = await handlePaddleNotification(event);
  // Unknown accounts get a 5xx so Paddle keeps retrying while the account catches up.
  return new Response(result, { status: result === "unknown-user" ? 500 : 200 });
}
