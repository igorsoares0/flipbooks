import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/auth/session";
import { getViewableFlipbook } from "@/lib/data";
import { getOriginalPdfKey } from "@/lib/data/flipbooks";
import { presignGet } from "@/lib/storage";

// Downloads the original PDF: readers only when the owner allowed it (settings.showDownload),
// owners always. Redirects to a short-lived signed URL so the file never passes through here.
export async function GET(_request: Request, { params }: RouteContext<"/api/flipbooks/[id]/download">) {
  const { id } = await params;
  const flipbook = await getViewableFlipbook({ id });
  const notFound = () => new NextResponse("Not found", { status: 404 });
  if (!flipbook || flipbook.type !== "PDF") return notFound();

  const viewer = await getOptionalUser();
  if (viewer?.id !== flipbook.userId && !flipbook.settings.showDownload) return notFound();

  const key = await getOriginalPdfKey(flipbook.id);
  if (!key) return notFound();
  const url = await presignGet(key, { expiresIn: 5 * 60, downloadName: `${flipbook.slug}.pdf` });
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
