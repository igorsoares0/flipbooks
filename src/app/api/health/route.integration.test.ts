import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// The health endpoint against the test database: a deploy that can reach Postgres answers
// 200, one that can't answers 503 so the platform restarts it instead of serving errors.

describe("health", () => {
  it("is well when the database answers", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("is sick when it isn't, without saying why", async () => {
    const { prisma } = await import("@/lib/db");
    const query = vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(new Error("connection refused"));

    const response = await GET();
    expect(response.status).toBe(503);
    // Nothing about the database reaches a public endpoint.
    await expect(response.json()).resolves.toEqual({ ok: false });
    query.mockRestore();
  });
});
