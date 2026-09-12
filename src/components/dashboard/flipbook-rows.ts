import type { FlipbookRow } from "@/components/dashboard/flipbook-table";
import { isViewable } from "@/lib/data";
import { formatCount, formatMb, formatRelative } from "@/lib/format";
import type { Flipbook } from "@/lib/types";

function describe(fb: Flipbook) {
  if (fb.status === "FAILED") return `Upload failed · ${fb.error ?? "unknown error"}`;
  const pages = `${fb.pageCount} pages`;
  if (fb.status === "PROCESSING") return `${pages} · rendering`;
  if (fb.type === "PDF" && fb.fileSize) return `${pages} · ${formatMb(fb.fileSize)}`;
  if (fb.visibility === "PRIVATE") return `${pages} · private`;
  return `${pages} · edited by you`;
}

export function toFlipbookRows(flipbooks: Flipbook[]): FlipbookRow[] {
  const now = Date.now();
  return flipbooks.map((fb) => ({
    id: fb.id,
    slug: fb.slug,
    title: fb.title,
    type: fb.type,
    status: fb.status,
    meta: describe(fb),
    views: fb.views === null ? "—" : formatCount(fb.views),
    updated: formatRelative(fb.updatedAt, now),
    tint: fb.thumbnailTint,
    hasPages: isViewable(fb),
  }));
}
