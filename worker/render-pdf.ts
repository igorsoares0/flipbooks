import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import type { PrismaClient } from "../src/generated/prisma/client";
import { grantingSubscriptionWhere, resolveEntitlements } from "../src/lib/entitlements";
import { PAGE_WIDTH } from "../src/lib/flipbook-rules";
import { downloadToFile, keys, putObject } from "../src/lib/storage/s3";
import { ProcessingError } from "./errors";

// PDF → one WebP per page plus a thumbnail, then Page rows pointing at them (spec §9).
// PDFs are untrusted input: no XFA forms, no system fonts, bounded image and page size,
// one page in memory at a time. (pdf.js 6 no longer compiles fonts with eval at all.)

const MAX_PAGE_PX = { width: 1600, height: 4000 };
const THUMBNAIL_WIDTH = 320;

const projectRequire = createRequire(path.join(process.cwd(), "package.json"));
const pdfjsRoot = path.dirname(projectRequire.resolve("pdfjs-dist/package.json"));

type PdfDocument = Awaited<ReturnType<(typeof import("pdfjs-dist/legacy/build/pdf.mjs"))["getDocument"]>["promise"]>;

async function openPdf(file: string): Promise<PdfDocument> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return getDocument({
    data: new Uint8Array(await readFile(file)),
    enableXfa: false,
    useSystemFonts: false,
    // Refuse absurd embedded images (decompression bombs) instead of allocating them.
    maxImageSize: 64 * 1024 * 1024,
    standardFontDataUrl: path.join(pdfjsRoot, "standard_fonts") + path.sep,
    cMapUrl: path.join(pdfjsRoot, "cmaps") + path.sep,
    cMapPacked: true,
    verbosity: 0,
  }).promise;
}

async function renderPage(pdf: PdfDocument, pageNumber: number) {
  const page = await pdf.getPage(pageNumber);
  try {
    const natural = page.getViewport({ scale: 1 });
    const scale = Math.min(MAX_PAGE_PX.width / natural.width, MAX_PAGE_PX.height / natural.height);
    const viewport = page.getViewport({ scale });
    const factory = (pdf as unknown as { canvasFactory: { create(w: number, h: number): { canvas: { toBuffer(type: "image/png"): Buffer } } } })
      .canvasFactory;
    const { canvas } = factory.create(Math.round(viewport.width), Math.round(viewport.height));
    // PDF pages are transparent by default; readers expect paper.
    await page.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport, background: "rgb(255,255,255)" }).promise;
    const png = canvas.toBuffer("image/png");
    const [image, thumbnail] = await Promise.all([
      sharp(png).webp({ quality: 82 }).toBuffer(),
      sharp(png).resize({ width: THUMBNAIL_WIDTH }).webp({ quality: 76 }).toBuffer(),
    ]);
    return { image, thumbnail, aspect: natural.height / natural.width };
  } finally {
    page.cleanup();
  }
}

async function planFor(prisma: PrismaClient, userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, ...grantingSubscriptionWhere() },
    orderBy: { createdAt: "desc" },
  });
  return resolveEntitlements(subscription?.plan ?? "FREE");
}

export async function renderPdfJob(
  prisma: PrismaClient,
  flipbookId: string,
  { signal, onProgress }: { signal?: AbortSignal; onProgress?: (done: number, total: number) => void } = {},
) {
  const flipbook = await prisma.flipbook.findUnique({ where: { id: flipbookId } });
  if (!flipbook) throw new ProcessingError("the flipbook was deleted");
  if (!flipbook.originalPdfKey) throw new ProcessingError("the original file is missing");

  const entitlements = await planFor(prisma, flipbook.userId);
  const dir = await mkdtemp(path.join(tmpdir(), "flipbook-"));
  let pdf: PdfDocument | undefined;
  try {
    const file = path.join(dir, "original.pdf");
    await downloadToFile(flipbook.originalPdfKey, file);
    pdf = await openPdf(file);

    const total = pdf.numPages;
    if (total > entitlements.maxPagesPerFlipbook) {
      throw new ProcessingError(`it has ${total} pages and your plan allows ${entitlements.maxPagesPerFlipbook}`);
    }

    const pages: { pageNumber: number; height: number }[] = [];
    for (let pageNumber = 1; pageNumber <= total; pageNumber++) {
      signal?.throwIfAborted();
      const { image, thumbnail, aspect } = await renderPage(pdf, pageNumber);
      await Promise.all([
        putObject(keys.page(flipbookId, pageNumber), image, "image/webp"),
        putObject(keys.thumbnail(flipbookId, pageNumber), thumbnail, "image/webp"),
      ]);
      pages.push({ pageNumber, height: Math.round(PAGE_WIDTH * aspect) });
      onProgress?.(pageNumber, total);
    }

    // Re-running a job rewrites the same keys and rows, so retries are safe.
    await prisma.$transaction([
      prisma.page.deleteMany({ where: { flipbookId } }),
      prisma.page.createMany({
        data: pages.map(({ pageNumber, height }) => ({
          flipbookId,
          pageNumber,
          width: PAGE_WIDTH,
          height: Math.min(Math.max(height, 100), 4000),
          background: { color: "#FFFFFF" },
          backgroundImageKey: keys.page(flipbookId, pageNumber),
        })),
      }),
      prisma.flipbook.update({
        where: { id: flipbookId },
        data: { status: "READY", pageCount: total, thumbnailKey: keys.thumbnail(flipbookId, 1), error: null },
      }),
    ]);
    return { pageCount: total };
  } finally {
    await pdf?.cleanup().catch(() => undefined);
    await pdf?.loadingTask.destroy().catch(() => undefined);
    await rm(dir, { recursive: true, force: true });
  }
}
