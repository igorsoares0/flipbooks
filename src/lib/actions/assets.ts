"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import * as assets from "@/lib/data/assets";
import { getEntitlements } from "@/lib/data/flipbooks";
import { rateLimit, UPLOADS_PER_HOUR } from "@/lib/rate-limit";
import { presignUpload } from "@/lib/storage";
import type { ActionResult } from "./flipbooks";

// Image library actions. Actions are public HTTP endpoints: authenticate, validate,
// check the plan, then write.

const startSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  size: z.number().int().positive(),
  contentType: z.enum(Object.keys(assets.IMAGE_TYPES) as [assets.ImageType, ...assets.ImageType[]], {
    error: "Choose a JPG, PNG or WebP image.",
  }),
});

export type StartAssetUploadResult = { ok: true; key: string; uploadUrl: string; contentType: string } | { ok: false; error: string };

export async function startAssetUpload(input: unknown): Promise<StartAssetUploadResult> {
  const user = await requireUser();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid file." };

  if (!rateLimit(`upload:${user.id}`, UPLOADS_PER_HOUR).ok) return { ok: false, error: "That's a lot of uploads at once. Try again in a few minutes." };

  const created = await assets.createAssetUpload(user.id, await getEntitlements(user.id), parsed.data);
  if (!created.ok) return created;
  // The content type is fixed here and covered by the signature.
  const uploadUrl = await presignUpload(created.key, { contentType: parsed.data.contentType });
  return { ok: true, key: created.key, uploadUrl, contentType: parsed.data.contentType };
}

const finishSchema = z.object({ key: z.string().min(1).max(300), filename: z.string().max(255) });

export type FinishAssetUploadResult = { ok: true; asset: assets.AssetRecord } | { ok: false; error: string };

export async function finishAssetUpload(input: unknown): Promise<FinishAssetUploadResult> {
  const user = await requireUser();
  const parsed = finishSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const result = await assets.registerAsset(user.id, await getEntitlements(user.id), parsed.data);
  if (result.ok) revalidatePath("/dashboard", "layout");
  return result;
}

const idSchema = z.string().min(1).max(64);

export async function assetUsageAction(id: string): Promise<{ ok: true; flipbooks: number } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid input." };
  const flipbooks = await assets.getAssetUsage(user.id, id);
  return flipbooks === null ? { ok: false, error: "This image no longer exists." } : { ok: true, flipbooks };
}

export async function deleteAssetAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid input." };
  if (!(await assets.deleteAsset(user.id, id))) return { ok: false, error: "This image no longer exists." };
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
