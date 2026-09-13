"use client";

import { finishAssetUpload, startAssetUpload } from "@/lib/actions/assets";
import type { AssetRecord } from "@/lib/data/assets";
import { formatMb } from "@/lib/format";
import { putWithProgress } from "@/lib/upload-client";

// Browser side of image uploads, shared by the editor's Uploads panel and the
// asset library page: presigned PUT straight to storage, then the server checks the file.

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const ACCEPTED = new Set(IMAGE_ACCEPT.split(","));
const MAX_BYTES = 15 * 1024 * 1024;

export function checkImageFile(file: Pick<File, "type" | "size">): string | null {
  if (!ACCEPTED.has(file.type)) return "Only JPG, PNG and WebP images.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_BYTES) return `That image is ${formatMb(file.size)}. Images can be up to 15 MB.`;
  return null;
}

export async function uploadImage(
  file: File,
  onProgress: (ratio: number) => void,
): Promise<{ ok: true; asset: AssetRecord } | { ok: false; error: string }> {
  const problem = checkImageFile(file);
  if (problem) return { ok: false, error: problem };

  const started = await startAssetUpload({ filename: file.name, size: file.size, contentType: file.type });
  if (!started.ok) return started;
  try {
    // The last few percent are the server's check.
    await putWithProgress(started.uploadUrl, file, started.contentType, (ratio) => onProgress(ratio * 0.95));
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The upload failed." };
  }
  return finishAssetUpload({ key: started.key, filename: file.name });
}
