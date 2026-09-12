"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import * as mutations from "@/lib/data/flipbook-mutations";
import { getEntitlements, getOwnedFlipbook } from "@/lib/data/flipbooks";
import { patchViolation, UPGRADE_MESSAGES } from "@/lib/entitlements/policy";
import { slugProblem } from "@/lib/flipbook-rules";
import { findTemplate } from "@/lib/templates";
import { documentSchema, flipbookPatchSchema } from "@/lib/validation";

// Every action: authenticate → validate input → check ownership and plan → write.
// Actions are public HTTP endpoints, so none of these checks may be skipped.

export type ActionResult = { ok: true } | { ok: false; error: string };

const idSchema = z.string().min(1).max(64);
const fail = (error: string): ActionResult => ({ ok: false, error });
const NOT_FOUND = "This flipbook no longer exists.";

function revalidateFlipbook(id: string) {
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/dashboard/flipbooks/${id}`, "layout");
}

/** Form action for "Open editor" and template cards. */
export async function createFlipbookAction(formData: FormData) {
  const user = await requireUser();
  const entitlements = await getEntitlements(user.id);
  if (!entitlements.canUseCanvasEditor) redirect("/dashboard/billing?upgrade=canvas");

  const templateId = formData.get("templateId");
  const template = typeof templateId === "string" ? findTemplate(templateId) : undefined;
  const flipbook = await mutations.createFlipbook(user.id, { template });
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/flipbooks/${flipbook.id}/editor`);
}

export async function updateFlipbookAction(id: string, patch: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = flipbookPatchSchema.safeParse(patch);
  if (!idSchema.safeParse(id).success || !parsed.success) return fail(parsed.error?.issues[0]?.message ?? "Invalid input.");

  const violation = patchViolation(await getEntitlements(user.id), parsed.data);
  if (violation) return fail(violation);

  if (!(await mutations.updateFlipbook(user.id, id, parsed.data))) return fail(NOT_FOUND);
  revalidateFlipbook(id);
  return { ok: true };
}

export async function checkSlugAction(id: string, slug: string): Promise<{ available: boolean; problem: string | null }> {
  await requireUser();
  const problem = typeof slug === "string" ? slugProblem(slug) : "Invalid address.";
  if (problem) return { available: false, problem };
  const taken = await mutations.isSlugTaken(slug, id);
  return { available: !taken, problem: taken ? "That address is taken." : null };
}

export async function updateSlugAction(id: string, slug: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!idSchema.safeParse(id).success || typeof slug !== "string") return fail("Invalid input.");
  const problem = slugProblem(slug);
  if (problem) return fail(problem);
  if (!(await getEntitlements(user.id)).canUseCustomSlug) return fail(UPGRADE_MESSAGES.slug);

  const result = await mutations.setSlug(user.id, id, slug);
  if (result === "taken") return fail("That address is taken.");
  if (result === "not-found") return fail(NOT_FOUND);
  revalidateFlipbook(id);
  return { ok: true };
}

export async function publishFlipbookAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.emailVerified) return fail("Verify your email before publishing. We sent you a link.");
  const flipbook = idSchema.safeParse(id).success ? await getOwnedFlipbook(user.id, id) : null;
  if (!flipbook) return fail(NOT_FOUND);
  if (!(await mutations.publishFlipbook(user.id, id))) return fail("Add at least one page before publishing.");
  revalidateFlipbook(id);
  redirect(`/f/${flipbook.slug}`);
}

export async function duplicateFlipbookAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!idSchema.safeParse(id).success) return fail("Invalid input.");
  if (!(await mutations.duplicateFlipbook(user.id, id))) return fail(NOT_FOUND);
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteFlipbookAction(id: string, options: { redirectTo?: string } = {}): Promise<ActionResult> {
  const user = await requireUser();
  if (!idSchema.safeParse(id).success) return fail("Invalid input.");
  if (!(await mutations.deleteFlipbook(user.id, id))) return fail(NOT_FOUND);
  revalidatePath("/dashboard", "layout");
  if (options.redirectTo === "/dashboard/flipbooks") redirect("/dashboard/flipbooks");
  return { ok: true };
}

export async function saveDocumentAction(id: string, pages: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = documentSchema.safeParse(pages);
  if (!idSchema.safeParse(id).success || !parsed.success) return fail("The document could not be saved: invalid data.");
  if (!(await getEntitlements(user.id)).canUseCanvasEditor) return fail(UPGRADE_MESSAGES.canvas);

  if (!(await mutations.saveDocument(user.id, id, parsed.data))) return fail(NOT_FOUND);
  revalidateFlipbook(id);
  return { ok: true };
}
