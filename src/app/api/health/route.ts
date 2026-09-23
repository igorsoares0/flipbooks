import { prisma } from "@/lib/db";

// Liveness for the container platform. Coolify polls this to decide when a new deploy is
// serving and when to restart a sick container, so it checks the database too: an app that
// can't reach Postgres is up but useless.

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true }, { status: 200 });
  } catch {
    // Deliberately quiet: this endpoint is public, so it says whether it is well, never why.
    return Response.json({ ok: false }, { status: 503 });
  }
}
