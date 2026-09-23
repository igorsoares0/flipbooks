import "server-only";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { deleteObject, head, isObjectChanged, keys, presignGet, promoteUpload, readRange } from "@/lib/storage";
import type { Entitlements } from "@/lib/types";
import { getUsage } from "./flipbooks";

// The image library (spec §10): pictures are uploaded straight to storage (to the incoming
// copy of their assets/{userId}/ key), then checked and moved into place here before they
// become usable in the editor.

export const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export type ImageType = keyof typeof IMAGE_TYPES;
export const MAX_ASSET_BYTES = 15 * 1024 * 1024;
// Larger pictures would be slow to decode in every reader's browser.
const MAX_DIMENSION = 12_000;
// Enough to reach the size header of any JPEG, even behind a large EXIF block.
const HEADER_BYTES = 512 * 1024;
const URL_TTL_SECONDS = 60 * 60;
const UPLOAD_CHANGED = "The upload changed while it was being checked. Try again.";

export type AssetRecord = {
  id: string;
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  createdAt: string;
};

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

type AssetRow = { id: string; key: string; filename: string; mimeType: string; size: number; width: number | null; height: number | null; createdAt: Date };

async function toRecord(row: AssetRow): Promise<AssetRecord> {
  return {
    id: row.id,
    key: row.key,
    url: await presignGet(row.key, { expiresIn: URL_TTL_SECONDS }),
    filename: row.filename,
    mimeType: row.mimeType,
    size: row.size,
    width: row.width ?? 0,
    height: row.height ?? 0,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listAssets(userId: string) {
  const rows = await prisma.asset.findMany({ where: { userId, type: "IMAGE" }, orderBy: { createdAt: "desc" } });
  return Promise.all(rows.map(toRecord));
}

/** Plan and quota checks for a new picture; returns the key the browser uploads to. */
export async function createAssetUpload(
  userId: string,
  entitlements: Entitlements,
  { size, contentType }: { size: number; contentType: ImageType },
): Promise<Result<{ key: string }>> {
  if (!entitlements.canUseCanvasEditor) return { ok: false, error: "Image uploads aren't part of your plan." };
  if (size <= 0) return { ok: false, error: "That file is empty." };
  if (size > MAX_ASSET_BYTES) return { ok: false, error: "Images can be up to 15 MB." };
  const usage = await getUsage(userId);
  if (usage.storageBytes + size > entitlements.maxStorageBytes) {
    return { ok: false, error: "This upload would go over your storage limit. Delete something first." };
  }
  return { ok: true, key: keys.asset(userId, randomUUID().replaceAll("-", ""), IMAGE_TYPES[contentType]) };
}

/** The image type given away by the file's first bytes, whatever its name says. */
export function sniffImageType(bytes: Buffer): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

const KEY_PATTERN = /^assets\/[^/]+\/[0-9a-f]{32}\.(jpg|png|webp)$/;

/**
 * Called once the browser says the upload finished. The key must be one we handed out to
 * this user; the stored object must really be a picture of an allowed type and size.
 * Anything that fails is deleted so it never counts against storage.
 */
export async function registerAsset(
  userId: string,
  entitlements: Entitlements,
  { key, filename }: { key: string; filename: string },
): Promise<Result<{ asset: AssetRecord }>> {
  if (!key.startsWith(keys.assetPrefix(userId)) || !KEY_PATTERN.test(key)) return { ok: false, error: "This upload isn't yours." };
  if (await prisma.asset.findUnique({ where: { key }, select: { id: true } })) return { ok: false, error: "This upload was already handled." };

  // The browser uploaded to the incoming key; everything below checks that one version (ETag).
  const upload = keys.incoming(key);
  const reject = async (error: string): Promise<Result<never>> => {
    await deleteObject(upload).catch(() => undefined);
    return { ok: false, error };
  };

  const stored = await head(upload);
  if (!stored) return { ok: false, error: "The upload did not reach storage." };
  if (stored.size === 0 || stored.size > MAX_ASSET_BYTES) return reject("Images can be up to 15 MB.");
  const usage = await getUsage(userId);
  if (usage.storageBytes + stored.size > entitlements.maxStorageBytes) return reject("This upload would go over your storage limit.");

  let bytes: Buffer;
  try {
    bytes = await readRange(upload, 0, Math.min(stored.size, HEADER_BYTES) - 1, { ifMatch: stored.etag ?? undefined });
  } catch (error) {
    if (isObjectChanged(error)) return reject(UPLOAD_CHANGED);
    throw error;
  }
  const type = sniffImageType(bytes);
  if (!type || IMAGE_TYPES[type] !== key.split(".").pop()) return reject("That file isn't a JPG, PNG or WebP image.");

  let width: number;
  let height: number;
  try {
    const meta = await sharp(bytes).metadata();
    if (!meta.width || !meta.height) throw new Error("no size");
    // EXIF orientations 5–8 are stored sideways; browsers display them upright.
    const sideways = (meta.orientation ?? 1) >= 5;
    width = sideways ? meta.height : meta.width;
    height = sideways ? meta.width : meta.height;
  } catch {
    return reject("We couldn't read that image.");
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) return reject(`Images can be up to ${MAX_DIMENSION.toLocaleString("en-US")} pixels wide or tall.`);
  // The upload URL still works until it expires, so readers only ever get the copy made
  // here, of exactly the bytes checked above.
  if (!(await promoteUpload(key, stored.etag))) return reject(UPLOAD_CHANGED);

  const row = await prisma.asset.create({
    data: { userId, type: "IMAGE", key, filename: filename.trim().slice(0, 255) || "Image", mimeType: type, size: stored.size, width, height },
  });
  return { ok: true, asset: await toRecord(row) };
}

/** How many of the user's flipbooks place this picture. */
export async function assetUsage(userId: string, key: string) {
  return prisma.flipbook.count({
    where: { userId, pages: { some: { elements: { some: { type: "IMAGE", properties: { path: ["assetKey"], equals: key } } } } } },
  });
}

export async function getAssetUsage(userId: string, id: string) {
  const asset = await prisma.asset.findFirst({ where: { id, userId }, select: { key: true } });
  return asset ? assetUsage(userId, asset.key) : null;
}

/** Deletes the picture and its file. Pages that placed it show "Image missing". */
export async function deleteAsset(userId: string, id: string) {
  const asset = await prisma.asset.findFirst({ where: { id, userId } });
  if (!asset) return false;
  await prisma.asset.delete({ where: { id: asset.id } });
  await deleteObject(asset.key).catch((error) => console.error("[storage] asset cleanup failed", asset.key, error));
  return true;
}
