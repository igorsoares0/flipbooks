"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { countFlipbooks, getEntitlements } from "@/lib/data/flipbooks";
import { flipbookLimitViolation } from "@/lib/entitlements/policy";
import { checkUploadAllowed, confirmPdfUpload, createPdfUpload, retryPdfProcessing } from "@/lib/data/uploads";
import { PDF_CONTENT_TYPE } from "@/lib/flipbook-rules";
import { rateLimit, UPLOADS_PER_HOUR } from "@/lib/rate-limit";
import { presignUpload } from "@/lib/storage";
import type { ActionResult } from "./flipbooks";

// Actions are public HTTP endpoints: authenticate, validate, check the plan, then write.

const startSchema = z.object({
  filename: z.string().trim().min(1).max(255).regex(/\.pdf$/i, "Choose a PDF file."),
  size: z.number().int().positive(),
});

export type StartUploadResult = { ok: true; flipbookId: string; uploadUrl: string; contentType: string } | { ok: false; error: string };

export async function startPdfUpload(input: unknown): Promise<StartUploadResult> {
  const user = await requireUser();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid file." };

  if (!rateLimit(`upload:${user.id}`, UPLOADS_PER_HOUR).ok) return { ok: false, error: "That's a lot of uploads at once. Try again in a few minutes." };

  const entitlements = await getEntitlements(user.id);
  const overLimit = flipbookLimitViolation(entitlements, await countFlipbooks(user.id));
  if (overLimit) return { ok: false, error: overLimit };
  const allowed = await checkUploadAllowed(user.id, entitlements, parsed.data.size);
  if (!allowed.ok) return allowed;

  const { flipbookId, key } = await createPdfUpload(user.id, parsed.data);
  // The content type is fixed server-side and covered by the signature.
  const uploadUrl = await presignUpload(key, { contentType: PDF_CONTENT_TYPE });
  revalidatePath("/dashboard", "layout");
  return { ok: true, flipbookId, uploadUrl, contentType: PDF_CONTENT_TYPE };
}

export async function finishPdfUpload(flipbookId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!z.string().min(1).max(64).safeParse(flipbookId).success) return { ok: false, error: "Invalid input." };
  const result = await confirmPdfUpload(user.id, flipbookId);
  revalidatePath("/dashboard", "layout");
  return result;
}

export async function retryProcessingAction(flipbookId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!z.string().min(1).max(64).safeParse(flipbookId).success) return { ok: false, error: "Invalid input." };
  const result = await retryPdfProcessing(user.id, flipbookId);
  revalidatePath("/dashboard", "layout");
  return result;
}
