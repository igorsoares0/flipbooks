import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NotFound,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Object storage over the S3 API: MinIO locally, Cloudflare R2 in production.
// No "server-only" import on purpose: the PDF worker (plain Node) uses this module too.

/** Object keys, laid out as in spec §10. */
export const keys = {
  prefix: (flipbookId: string) => `flipbooks/${flipbookId}/`,
  original: (flipbookId: string) => `flipbooks/${flipbookId}/original.pdf`,
  page: (flipbookId: string, pageNumber: number) => `flipbooks/${flipbookId}/pages/${pad(pageNumber)}.webp`,
  thumbnail: (flipbookId: string, pageNumber: number) => `flipbooks/${flipbookId}/thumbnails/${pad(pageNumber)}.webp`,
  assetPrefix: (userId: string) => `assets/${userId}/`,
  asset: (userId: string, assetId: string, ext: string) => `assets/${userId}/${assetId}.${ext}`,
  /** Where the browser uploads a file bound for `key`, until the server has checked it. */
  incoming: (key: string) => `incoming/${key}`,
  incomingPrefix: "incoming/",
};

function pad(n: number) {
  return String(n).padStart(3, "0");
}

let cached: { client: S3Client; bucket: string } | undefined;

function storage() {
  if (cached) return cached;
  const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_FORCE_PATH_STYLE } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error("Object storage is not configured. Set the S3_* variables (see .env.example).");
  }
  cached = {
    bucket: S3_BUCKET,
    client: new S3Client({
      endpoint: S3_ENDPOINT,
      region: S3_REGION || "auto",
      forcePathStyle: S3_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
    }),
  };
  return cached;
}

/**
 * URL the browser PUTs a file bound for `key` to. It writes to the incoming copy, never to
 * `key` itself: the URL keeps working until it expires, so whatever it points at can be
 * replaced after the server has checked it (see promoteUpload). The signature covers the
 * content type. Storage checks the expiry when a request starts, so a short one still
 * allows slow uploads.
 */
export async function presignUpload(key: string, { contentType, expiresIn = 5 * 60 }: { contentType: string; expiresIn?: number }) {
  const { client, bucket } = storage();
  return getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: keys.incoming(key), ContentType: contentType }), { expiresIn });
}

export async function presignGet(key: string, { expiresIn = 60 * 60, downloadName }: { expiresIn?: number; downloadName?: string } = {}) {
  const { client, bucket } = storage();
  const disposition = downloadName ? `attachment; filename="${downloadName.replace(/["\\\r\n]/g, "")}"` : undefined;
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentDisposition: disposition }), {
    expiresIn,
  });
}

/** Size, type and version (ETag) of an object, or null when it doesn't exist. */
export async function head(key: string) {
  const { client, bucket } = storage();
  try {
    const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { size: result.ContentLength ?? 0, contentType: result.ContentType ?? null, etag: result.ETag ?? null };
  } catch (error) {
    if (error instanceof NotFound || (error as { name?: string }).name === "NotFound") return null;
    throw error;
  }
}

/** Bytes `start`–`end` of an object; with `ifMatch`, only from that version (else it throws, see isObjectChanged). */
export async function readRange(key: string, start: number, end: number, { ifMatch }: { ifMatch?: string } = {}) {
  const { client, bucket } = storage();
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: `bytes=${start}-${end}`, IfMatch: ifMatch }));
  return Buffer.from(await result.Body!.transformToByteArray());
}

/** Whether a storage error means the object is gone, or is no longer the version a condition named. */
export function isObjectChanged(error: unknown) {
  const { name, $metadata } = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return name === "PreconditionFailed" || name === "NoSuchKey" || name === "NotFound" || $metadata?.httpStatusCode === 412;
}

/**
 * Moves a checked upload from its incoming key to `key`, but only if it is still the version
 * that was checked (`etag`). Returns false when it changed or vanished in between.
 */
export async function promoteUpload(key: string, etag: string | null) {
  if (!etag) return false;
  const { client, bucket } = storage();
  const from = keys.incoming(key);
  try {
    await client.send(new CopyObjectCommand({ Bucket: bucket, Key: key, CopySource: `${bucket}/${encodeURI(from)}`, CopySourceIfMatch: etag }));
  } catch (error) {
    if (isObjectChanged(error)) return false;
    throw error;
  }
  // Best effort: the worker sweeps incoming files that stay behind.
  await deleteObject(from).catch(() => undefined);
  return true;
}

/** The whole object in memory. Only for small files (thumbnails, headers). */
export async function getObject(key: string) {
  const { client, bucket } = storage();
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return Buffer.from(await result.Body!.transformToByteArray());
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  const { client, bucket } = storage();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Rendered pages never change under the same key within a job, so caches may keep them.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function downloadToFile(key: string, path: string) {
  const { client, bucket } = storage();
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  await pipeline(result.Body as Readable, createWriteStream(path));
}

export async function deleteObject(key: string) {
  const { client, bucket } = storage();
  await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: [{ Key: key }], Quiet: true } }));
}

/** Objects under a prefix, with when each was written. */
export async function listObjects(prefix: string) {
  const { client, bucket } = storage();
  const found: { key: string; lastModified: Date }[] = [];
  let token: string | undefined;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
    found.push(...(page.Contents ?? []).flatMap((o) => (o.Key ? [{ key: o.Key, lastModified: o.LastModified ?? new Date(0) }] : [])));
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return found;
}

async function listKeys(prefix: string) {
  return (await listObjects(prefix)).map((o) => o.key);
}

export async function deletePrefix(prefix: string) {
  if (!prefix.endsWith("/")) throw new Error("deletePrefix expects a folder prefix ending in /");
  const { client, bucket } = storage();
  const all = await listKeys(prefix);
  for (let i = 0; i < all.length; i += 1000) {
    const chunk = all.slice(i, i + 1000).map((Key) => ({ Key }));
    await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: chunk, Quiet: true } }));
  }
  return all.length;
}

/** Copies every object under one prefix to another (used when duplicating a PDF flipbook). */
export async function copyPrefix(from: string, to: string) {
  const { client, bucket } = storage();
  const all = await listKeys(from);
  const queue = [...all];
  const copyNext = async (): Promise<void> => {
    const key = queue.shift();
    if (!key) return;
    await client.send(
      new CopyObjectCommand({ Bucket: bucket, Key: to + key.slice(from.length), CopySource: `${bucket}/${encodeURI(key)}` }),
    );
    return copyNext();
  };
  await Promise.all(Array.from({ length: 8 }, copyNext));
  return all.length;
}
