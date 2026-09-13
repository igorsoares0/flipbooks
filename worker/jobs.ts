import type { PrismaClient } from "../src/generated/prisma/client";
import { backoffMs, MAX_ATTEMPTS } from "./errors";

// A small job queue on top of the processing_jobs table (spec §9: no Redis in the MVP).

export type ClaimedJob = { id: string; flipbookId: string; type: string; attempts: number };

/**
 * Atomically takes the oldest runnable job. FOR UPDATE SKIP LOCKED lets several workers
 * poll the same table without ever picking the same job twice.
 */
export async function claimNextJob(prisma: PrismaClient): Promise<ClaimedJob | null> {
  const rows = await prisma.$queryRaw<ClaimedJob[]>`
    UPDATE "processing_jobs"
    SET "status" = 'RUNNING', "startedAt" = now(), "attempts" = "attempts" + 1
    WHERE "id" = (
      SELECT "id" FROM "processing_jobs"
      WHERE "status" = 'PENDING' AND "runAfter" <= now()
      ORDER BY "createdAt"
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING "id", "flipbookId", "type", "attempts"`;
  return rows[0] ?? null;
}

export async function completeJob(prisma: PrismaClient, jobId: string) {
  await prisma.processingJob.update({ where: { id: jobId }, data: { status: "DONE", completedAt: new Date(), error: null } });
}

/** Schedules a retry, or gives up once attempts run out. Returns what happened. */
export async function failJob(
  prisma: PrismaClient,
  job: ClaimedJob,
  { reason, retryable }: { reason: string; retryable: boolean },
): Promise<"retrying" | "failed"> {
  if (retryable && job.attempts < MAX_ATTEMPTS) {
    await prisma.processingJob.update({
      where: { id: job.id },
      data: { status: "PENDING", error: reason, runAfter: new Date(Date.now() + backoffMs(job.attempts)) },
    });
    return "retrying";
  }
  await prisma.$transaction([
    prisma.processingJob.update({ where: { id: job.id }, data: { status: "FAILED", error: reason, completedAt: new Date() } }),
    prisma.flipbook.update({ where: { id: job.flipbookId }, data: { status: "FAILED", error: reason } }),
  ]);
  return "failed";
}

/** Jobs left RUNNING by a worker that died go back to the queue. */
export async function requeueStuckJobs(prisma: PrismaClient, olderThanMs = 15 * 60_000) {
  const { count } = await prisma.processingJob.updateMany({
    where: { status: "RUNNING", startedAt: { lt: new Date(Date.now() - olderThanMs) } },
    data: { status: "PENDING", runAfter: new Date() },
  });
  return count;
}

/** Uploads the browser never finished: remove the row and whatever reached storage. */
export async function removeAbandonedUploads(
  prisma: PrismaClient,
  deleteFiles: (flipbookId: string) => Promise<unknown>,
  olderThanMs = 24 * 60 * 60_000,
) {
  const stale = await prisma.flipbook.findMany({
    where: { status: "UPLOADING", createdAt: { lt: new Date(Date.now() - olderThanMs) } },
    select: { id: true },
  });
  for (const { id } of stale) {
    await prisma.flipbook.delete({ where: { id } });
    await deleteFiles(id).catch(() => undefined);
  }
  return stale.length;
}

/**
 * Image files with no library row: uploads the browser never finished. They don't count
 * against anyone's storage, so they must not pile up. Presigned uploads expire after 15
 * minutes, so anything older than an hour is safe to remove.
 */
export async function removeOrphanAssets(
  prisma: PrismaClient,
  files: { list: (prefix: string) => Promise<{ key: string; lastModified: Date }[]>; remove: (key: string) => Promise<unknown> },
  olderThanMs = 60 * 60_000,
) {
  const cutoff = Date.now() - olderThanMs;
  const old = (await files.list("assets/")).filter((file) => file.lastModified.getTime() < cutoff);
  let removed = 0;
  for (let i = 0; i < old.length; i += 500) {
    const chunk = old.slice(i, i + 500);
    const rows = await prisma.asset.findMany({ where: { key: { in: chunk.map((f) => f.key) } }, select: { key: true } });
    const known = new Set(rows.map((row) => row.key));
    for (const file of chunk) {
      if (known.has(file.key)) continue;
      await files.remove(file.key).catch(() => undefined);
      removed += 1;
    }
  }
  return removed;
}
