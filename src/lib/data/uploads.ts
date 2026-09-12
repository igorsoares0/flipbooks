import "server-only";

import { prisma } from "@/lib/db";
import { DEFAULT_SETTINGS, titleFromFilename } from "@/lib/flipbook-rules";
import { deletePrefix, head, keys, readRange } from "@/lib/storage";
import type { Entitlements } from "@/lib/types";
import { uniqueSlug } from "./flipbook-mutations";
import { getUsage } from "./flipbooks";

// PDF uploads: the browser PUTs straight to storage with a presigned URL; the server
// creates the row first and checks the stored object afterwards (R2 does not enforce
// Content-Length on presigned PUTs, so size and type are verified here).

export const RENDER_PDF = "RENDER_PDF";

export type UploadCheck = { ok: true } | { ok: false; error: string };

/** Plan limits for a new upload of `size` bytes. */
export async function checkUploadAllowed(userId: string, entitlements: Entitlements, size: number): Promise<UploadCheck> {
  if (size <= 0) return { ok: false, error: "That file is empty." };
  if (size > entitlements.maxPdfBytes) {
    return { ok: false, error: `PDFs can be up to ${entitlements.maxPdfBytes / 1e6} MB on your plan.` };
  }
  const usage = await getUsage(userId);
  if (usage.storageBytes + size > entitlements.maxStorageBytes) {
    return { ok: false, error: "This upload would go over your storage limit. Delete something first, or upgrade." };
  }
  return { ok: true };
}

/** Creates the flipbook row (status UPLOADING) that the upload will fill in. */
export async function createPdfUpload(userId: string, { filename, size }: { filename: string; size: number }) {
  const title = titleFromFilename(filename);
  const flipbook = await prisma.flipbook.create({
    data: {
      userId,
      title,
      slug: await uniqueSlug(title),
      type: "PDF",
      status: "UPLOADING",
      visibility: "PUBLIC",
      settings: { ...DEFAULT_SETTINGS },
      thumbnailTint: ["#EFEBE2", "#DDD7C9"],
      fileSize: size,
      pageCount: 0,
    },
  });
  const key = keys.original(flipbook.id);
  await prisma.flipbook.update({ where: { id: flipbook.id }, data: { originalPdfKey: key } });
  return { flipbookId: flipbook.id, key };
}

/** A rejected upload: the object is deleted, so it stops counting against storage. */
async function fail(flipbookId: string, error: string): Promise<UploadCheck> {
  await prisma.flipbook.update({
    where: { id: flipbookId },
    data: { status: "FAILED", error, fileSize: null, originalPdfKey: null },
  });
  await deletePrefix(keys.prefix(flipbookId)).catch(() => undefined);
  return { ok: false, error };
}

/**
 * Called once the browser says the upload finished: verifies the stored object really is
 * the PDF we agreed on, then queues it for the worker.
 */
export async function confirmPdfUpload(userId: string, flipbookId: string): Promise<UploadCheck> {
  const flipbook = await prisma.flipbook.findFirst({ where: { id: flipbookId, userId } });
  if (!flipbook || flipbook.type !== "PDF") return { ok: false, error: "This upload no longer exists." };
  if (flipbook.status !== "UPLOADING" || !flipbook.originalPdfKey) return { ok: false, error: "This upload was already handled." };

  const stored = await head(flipbook.originalPdfKey);
  if (!stored) return fail(flipbookId, "the upload did not reach storage");
  if (stored.size !== flipbook.fileSize) return fail(flipbookId, "the uploaded file does not match");

  const magic = await readRange(flipbook.originalPdfKey, 0, 1023);
  // The header may follow a few junk bytes; readers accept it within the first 1 KB.
  if (!magic.includes(Buffer.from("%PDF-"))) return fail(flipbookId, "not a PDF file");

  await prisma.$transaction([
    prisma.flipbook.update({ where: { id: flipbookId }, data: { status: "PROCESSING", error: null } }),
    prisma.processingJob.create({ data: { flipbookId, type: RENDER_PDF, payload: {} } }),
  ]);
  return { ok: true };
}

/** Queues another processing attempt for a failed PDF whose original is still stored. */
export async function retryPdfProcessing(userId: string, flipbookId: string): Promise<UploadCheck> {
  const flipbook = await prisma.flipbook.findFirst({ where: { id: flipbookId, userId } });
  if (!flipbook || flipbook.type !== "PDF") return { ok: false, error: "This flipbook no longer exists." };
  if (flipbook.status !== "FAILED") return { ok: false, error: "Only failed uploads can be retried." };
  if (!flipbook.originalPdfKey || !(await head(flipbook.originalPdfKey))) {
    return { ok: false, error: "The original file is gone. Upload the PDF again." };
  }
  await prisma.$transaction([
    prisma.flipbook.update({ where: { id: flipbookId }, data: { status: "PROCESSING", error: null } }),
    prisma.processingJob.create({ data: { flipbookId, type: RENDER_PDF, payload: {} } }),
  ]);
  return { ok: true };
}
