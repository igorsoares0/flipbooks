import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { deleteFlipbook, duplicateFlipbook, saveDocument } from "@/lib/data/flipbook-mutations";
import { getPages } from "@/lib/data/flipbooks";
import { checkUploadAllowed, confirmPdfUpload, createPdfUpload, retryPdfProcessing } from "@/lib/data/uploads";
import { resolveEntitlements } from "@/lib/entitlements";
import { deleteObject, head, keys, listObjects, putObject, readRange } from "@/lib/storage/s3";
import { documentSchema } from "@/lib/validation";
import { A4_LANDSCAPE, A4_PORTRAIT, corruptPdf, makePdf } from "../tests/pdf-fixtures";
import { describeFailure } from "./errors";
import { claimNextJob, completeJob, failJob, removeAbandonedUploads, removeOrphanAssets, requeueStuckJobs } from "./jobs";
import { renderPdfJob } from "./render-pdf";

// The whole PDF pipeline against real Postgres and MinIO: upload → confirm → claim → render.
// Uses its own accounts so the demo data other suites count stays untouched.
const PRO = "usr_pipeline_ltd"; // Lifetime Deal
const FREE_USER = "usr_pipeline_free"; // free plan

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [PRO, FREE_USER] } } });
  await prisma.user.create({
    data: { id: PRO, name: "Pipeline Pro", email: "pipeline-ltd@test.local", subscriptions: { create: { plan: "LIFETIME" } } },
  });
  await prisma.user.create({ data: { id: FREE_USER, name: "Pipeline Free", email: "pipeline-free@test.local" } });
});

afterAll(() => prisma.$disconnect());

/** Does what the browser does: create the row, PUT the bytes, confirm. */
async function upload(userId: string, bytes: Buffer, filename = "summer_catalog-2026.pdf") {
  const { flipbookId, key } = await createPdfUpload(userId, { filename, size: bytes.length });
  await putObject(key, bytes, "application/pdf");
  return { flipbookId, confirm: () => confirmPdfUpload(userId, flipbookId) };
}

/** Claims and runs jobs until the given flipbook's job is handled, like the worker loop. */
async function processJobFor(flipbookId: string) {
  for (;;) {
    const job = await claimNextJob(prisma);
    if (!job) throw new Error("no job to claim");
    try {
      await renderPdfJob(prisma, job.flipbookId);
      await completeJob(prisma, job.id);
    } catch (error) {
      await failJob(prisma, job, describeFailure(error));
    }
    if (job.flipbookId === flipbookId) return job;
  }
}

describe("upload checks", () => {
  it("enforces the plan's file size and storage limits", async () => {
    const free = resolveEntitlements("FREE");
    expect(await checkUploadAllowed(FREE_USER, free, 21e6)).toEqual({ ok: false, error: "PDFs can be up to 20 MB on your plan." });
    expect(await checkUploadAllowed(FREE_USER, free, 0)).toMatchObject({ ok: false });
    expect(await checkUploadAllowed(FREE_USER, { ...free, maxStorageBytes: 1 }, 1_000)).toMatchObject({ ok: false, error: expect.stringMatching(/storage limit/) });
    expect(await checkUploadAllowed(FREE_USER, free, 5e6)).toEqual({ ok: true });
  });

  it("names the flipbook after the file and marks it uploading", async () => {
    const { flipbookId } = await upload(PRO, await makePdf());
    const row = await prisma.flipbook.findUniqueOrThrow({ where: { id: flipbookId } });
    expect(row).toMatchObject({ title: "Summer catalog 2026", type: "PDF", status: "UPLOADING", originalPdfKey: keys.original(flipbookId) });
  });

  it("rejects a stored file whose size differs from what was declared", async () => {
    const bytes = await makePdf();
    const { flipbookId, key } = await createPdfUpload(PRO, { filename: "a.pdf", size: bytes.length + 10 });
    await putObject(key, bytes, "application/pdf");
    expect(await confirmPdfUpload(PRO, flipbookId)).toEqual({ ok: false, error: "the uploaded file does not match" });
    const row = await prisma.flipbook.findUniqueOrThrow({ where: { id: flipbookId } });
    expect(row).toMatchObject({ status: "FAILED", fileSize: null, originalPdfKey: null });
    expect(await head(key)).toBeNull(); // the object is gone too
  });

  it("rejects files that are not PDFs", async () => {
    const { confirm } = await upload(PRO, Buffer.from("<html>definitely not a pdf</html>"), "fake.pdf");
    expect(await confirm()).toEqual({ ok: false, error: "not a PDF file" });
  });

  it("only lets the owner confirm, once", async () => {
    const { flipbookId, confirm } = await upload(PRO, await makePdf());
    expect(await confirmPdfUpload(FREE_USER, flipbookId)).toMatchObject({ ok: false });
    expect(await confirm()).toEqual({ ok: true });
    expect(await confirm()).toEqual({ ok: false, error: "This upload was already handled." });
    expect(await prisma.processingJob.count({ where: { flipbookId } })).toBe(1);
    await processJobFor(flipbookId);
  });
});

describe("rendering", () => {
  it("renders every page to WebP with thumbnails and page rows that keep the aspect ratio", async () => {
    const { flipbookId, confirm } = await upload(PRO, await makePdf([A4_PORTRAIT, A4_LANDSCAPE, A4_PORTRAIT]));
    expect(await confirm()).toEqual({ ok: true });
    await processJobFor(flipbookId);

    const flipbook = await prisma.flipbook.findUniqueOrThrow({ where: { id: flipbookId } });
    expect(flipbook).toMatchObject({ status: "READY", pageCount: 3, thumbnailKey: keys.thumbnail(flipbookId, 1), error: null });

    const pages = await getPages(flipbookId);
    expect(pages.map((p) => [p.pageNumber, p.width, p.height])).toEqual([
      [1, 520, 736],
      [2, 520, 367],
      [3, 520, 736],
    ]);
    expect(pages[0].backgroundImageKey).toBe(keys.page(flipbookId, 1));
    expect(pages[0].backgroundImageUrl).toMatch(/^http:\/\/localhost:9000\/flipbook-test\/.+X-Amz-Signature=/);

    const image = await sharp(await readRange(keys.page(flipbookId, 2), 0, 10_000_000)).metadata();
    expect(image).toMatchObject({ format: "webp", width: 1600, height: 1131 });
    const thumbnail = await sharp(await readRange(keys.thumbnail(flipbookId, 1), 0, 10_000_000)).metadata();
    expect(thumbnail.width).toBe(320);

    const job = await prisma.processingJob.findFirstOrThrow({ where: { flipbookId } });
    expect(job).toMatchObject({ status: "DONE", attempts: 1 });
  });

  it("fails unreadable PDFs right away, without retrying, and allows a retry later", async () => {
    const { flipbookId, confirm } = await upload(PRO, corruptPdf(), "broken.pdf");
    expect(await confirm()).toEqual({ ok: true });
    await processJobFor(flipbookId);

    const flipbook = await prisma.flipbook.findUniqueOrThrow({ where: { id: flipbookId } });
    expect(flipbook).toMatchObject({ status: "FAILED", error: "the file is not a readable PDF" });
    const job = await prisma.processingJob.findFirstOrThrow({ where: { flipbookId } });
    expect(job).toMatchObject({ status: "FAILED", attempts: 1 });

    expect(await retryPdfProcessing(PRO, flipbookId)).toEqual({ ok: true });
    expect((await prisma.flipbook.findUniqueOrThrow({ where: { id: flipbookId } })).status).toBe("PROCESSING");
    await processJobFor(flipbookId);
  });

  it("stops at the plan's page limit", async () => {
    const free = resolveEntitlements("FREE");
    const tooMany = Array.from({ length: free.maxPdfPages + 1 }, () => [200, 200] as [number, number]);
    const { flipbookId, confirm } = await upload(FREE_USER, await makePdf(tooMany), "long.pdf");
    await confirm();
    await processJobFor(flipbookId);
    expect((await prisma.flipbook.findUniqueOrThrow({ where: { id: flipbookId } })).error).toBe(
      `it has ${free.maxPdfPages + 1} pages and your plan allows ${free.maxPdfPages}`,
    );
  });
});

describe("the job queue", () => {
  it("never hands the same job to two workers", async () => {
    const a = await upload(PRO, await makePdf([A4_PORTRAIT]));
    const b = await upload(PRO, await makePdf([A4_PORTRAIT]));
    await Promise.all([a.confirm(), b.confirm()]);
    const [first, second] = await Promise.all([claimNextJob(prisma), claimNextJob(prisma)]);
    expect(first && second).toBeTruthy();
    expect(first!.id).not.toBe(second!.id);
    for (const job of [first!, second!]) {
      await renderPdfJob(prisma, job.flipbookId);
      await completeJob(prisma, job.id);
    }
  });

  it("backs off transient failures, then gives up after three attempts", async () => {
    const { flipbookId, confirm } = await upload(PRO, await makePdf([A4_PORTRAIT]));
    await confirm();
    const transient = { reason: "something went wrong on our side", retryable: true };

    let job = (await claimNextJob(prisma))!;
    expect(await failJob(prisma, job, transient)).toBe("retrying");
    const waiting = await prisma.processingJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(waiting.status).toBe("PENDING");
    expect(waiting.runAfter.getTime()).toBeGreaterThan(Date.now() + 20_000);
    expect(await claimNextJob(prisma)).toBeNull(); // not runnable yet

    for (const attempt of [2, 3]) {
      await prisma.processingJob.update({ where: { id: job.id }, data: { runAfter: new Date() } });
      job = (await claimNextJob(prisma))!;
      expect(job.attempts).toBe(attempt);
      expect(await failJob(prisma, job, transient)).toBe(attempt < 3 ? "retrying" : "failed");
    }
    expect((await prisma.flipbook.findUniqueOrThrow({ where: { id: flipbookId } })).status).toBe("FAILED");
  });

  it("requeues jobs abandoned by a crashed worker", async () => {
    const { flipbookId, confirm } = await upload(PRO, await makePdf([A4_PORTRAIT]));
    await confirm();
    const job = (await claimNextJob(prisma))!;
    await prisma.processingJob.update({ where: { id: job.id }, data: { startedAt: new Date(Date.now() - 20 * 60_000) } });
    expect(await requeueStuckJobs(prisma)).toBe(1);
    expect((await prisma.processingJob.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("PENDING");
    await processJobFor(flipbookId);
  });

  it("removes uploads the browser never finished", async () => {
    const { flipbookId } = await upload(PRO, await makePdf([A4_PORTRAIT]));
    await prisma.flipbook.update({ where: { id: flipbookId }, data: { createdAt: new Date(Date.now() - 25 * 60 * 60_000) } });
    const deleted: string[] = [];
    expect(await removeAbandonedUploads(prisma, async (id) => deleted.push(id))).toBe(1);
    expect(deleted).toEqual([flipbookId]);
    expect(await prisma.flipbook.findUnique({ where: { id: flipbookId } })).toBeNull();
  });
});

describe("image housekeeping", () => {
  it("removes image files that never became library images, and nothing else", async () => {
    const orphan = keys.asset(PRO, "a".repeat(32), "png");
    const kept = keys.asset(PRO, "b".repeat(32), "png");
    await putObject(orphan, Buffer.from("half an upload"), "image/png");
    await putObject(kept, Buffer.from("a real one"), "image/png");
    await prisma.asset.create({ data: { userId: PRO, type: "IMAGE", key: kept, filename: "kept.png", mimeType: "image/png", size: 10 } });

    const files = { list: listObjects, remove: deleteObject };
    // Fresh files may still be uploading.
    await removeOrphanAssets(prisma, files);
    expect(await head(orphan)).not.toBeNull();

    expect(await removeOrphanAssets(prisma, files, 0)).toBeGreaterThanOrEqual(1);
    expect(await head(orphan)).toBeNull();
    expect(await head(kept)).not.toBeNull();
  });
});

describe("files follow their flipbook", () => {
  async function rendered() {
    const { flipbookId, confirm } = await upload(PRO, await makePdf([A4_PORTRAIT, A4_PORTRAIT]));
    await confirm();
    await processJobFor(flipbookId);
    return flipbookId;
  }

  it("duplicating copies the files under the copy's own prefix", async () => {
    const source = await rendered();
    const copy = (await duplicateFlipbook(PRO, source))!;
    const pages = await getPages(copy.id);
    expect(pages[1].backgroundImageKey).toBe(keys.page(copy.id, 2));
    expect(await head(keys.page(copy.id, 2))).not.toBeNull();
    expect(await head(keys.original(copy.id))).not.toBeNull();
  });

  it("deleting removes the files", async () => {
    const id = await rendered();
    expect(await deleteFlipbook(PRO, id)).toBe(true);
    expect(await head(keys.page(id, 1))).toBeNull();
    expect(await head(keys.original(id))).toBeNull();
  });

  it("autosave refuses page images from another flipbook", async () => {
    const mine = await rendered();
    const other = await rendered();
    const pages = documentSchema.parse(await getPages(mine));
    pages[0].backgroundImageKey = keys.page(other, 1);
    expect(await saveDocument(PRO, mine, pages)).toBe("foreign-file");
    pages[0].backgroundImageKey = keys.page(mine, 1);
    expect(await saveDocument(PRO, mine, pages)).toBe("ok");
  });
});
