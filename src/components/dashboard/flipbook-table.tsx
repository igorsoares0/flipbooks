"use client";

import { Eye } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RowMenu } from "@/components/dashboard/row-menu";
import { StatusBadge } from "@/components/ui/badges";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { tabItem } from "@/components/ui/tabs";
import type { FlipbookStatus, FlipbookType } from "@/lib/types";
import { cn } from "@/lib/utils";

export type FlipbookRow = {
  id: string;
  slug: string;
  title: string;
  type: FlipbookType;
  status: FlipbookStatus;
  meta: string;
  views: string;
  updated: string;
  tint: [string, string];
  /** Rendered cover (PDF flipbooks); the gradient shows until there is one. */
  thumbnailUrl: string | null;
  /** Processing and failed books have no pages to edit or view yet. */
  hasPages: boolean;
};

type Filter = "ALL" | FlipbookType | "DRAFT";

const FILTERS: { label: string; value: Filter; match: (row: FlipbookRow) => boolean }[] = [
  { label: "All", value: "ALL", match: () => true },
  { label: "PDF", value: "PDF", match: (row) => row.type === "PDF" },
  { label: "Canvas", value: "CANVAS", match: (row) => row.type === "CANVAS" },
  { label: "Drafts", value: "DRAFT", match: (row) => row.status === "DRAFT" },
];

const EMPTY_FILTER: Record<Exclude<Filter, "ALL">, string> = {
  PDF: "No PDF flipbooks yet.",
  CANVAS: "No canvas flipbooks yet.",
  DRAFT: "No drafts.",
};

export function FlipbookThumb({ tint, url, className }: { tint: [string, string]; url?: string | null; className?: string }) {
  const size = cn("h-[45px] w-[34px] shrink-0 bg-white shadow-cover", className);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, already a small WebP
    return <img src={url} alt="" loading="lazy" className={cn(size, "object-cover object-top")} />;
  }
  return <div className={size} style={{ background: `linear-gradient(150deg, ${tint[0]}, ${tint[1]})` }} />;
}

export function EmptyFlipbooks() {
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <div className="h-[90px] w-[68px] border-[1.5px] border-dashed border-placeholder" />
      <div>
        <div className="font-serif text-[24px] leading-tight tracking-[-0.5px]">No flipbooks yet</div>
        <p className="mt-1.5 max-w-[420px] text-[14px] leading-[1.55] text-pretty text-ink-2">
          Drop in a PDF and we&apos;ll render the pages, or start from a blank canvas.
        </p>
      </div>
      <ButtonLink href="/dashboard/flipbooks/new" variant="primary">
        Create your first flipbook
      </ButtonLink>
    </div>
  );
}

// Cover | title | status | views | updated | actions
const columns = "grid grid-cols-[34px_minmax(0,1fr)_auto] gap-x-4 md:grid-cols-[44px_minmax(0,1fr)_140px_90px_110px_136px] md:gap-x-[18px]";
const iconButton = buttonClasses({ variant: "secondary", size: "icon", className: "size-[30px]" });

export function FlipbookTable({
  title,
  rows,
  emptyMessage,
  actions,
}: {
  title: string;
  rows: FlipbookRow[];
  /** Shown instead of the first-run empty state, e.g. for a search with no hits. */
  emptyMessage?: string;
  /** Extra header controls, such as the search field. */
  actions?: React.ReactNode;
}) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const active = FILTERS.find((f) => f.value === filter)!;
  const visible = rows.filter(active.match);
  const message = rows.length === 0 ? emptyMessage : visible.length === 0 && filter !== "ALL" ? EMPTY_FILTER[filter] : null;

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-[22px] gap-y-3">
        <h2 className="font-serif text-[30px] leading-none tracking-[-0.8px]">{title}</h2>
        {rows.length > 0 && (
          <div className="flex flex-wrap gap-4" role="group" aria-label="Filter flipbooks">
            {FILTERS.map((f) => (
              <button key={f.value} onClick={() => setFilter(f.value)} aria-pressed={filter === f.value} className={tabItem(filter === f.value)}>
                {f.label} <span className="tabular-nums">{rows.filter(f.match).length}</span>
              </button>
            ))}
          </div>
        )}
        {actions && <div className="ml-auto self-center">{actions}</div>}
      </div>

      {rows.length === 0 && !emptyMessage && <EmptyFlipbooks />}
      {message && <div className="border-t border-ink py-10 text-[14px] text-muted">{message}</div>}

      {visible.length > 0 && (
        <div className="mt-2.5">
          <div className={cn(columns, "border-b border-ink py-2 text-xs text-muted max-md:hidden")}>
            <span />
            <span>Title</span>
            <span>Status</span>
            <span className="text-right">Views</span>
            <span className="text-right">Updated</span>
            <span className="sr-only">Actions</span>
          </div>
          {visible.map((row) => (
            <div key={row.id} data-flipbook-row className={cn(columns, "group items-center gap-y-1 border-b border-line py-2 hover:bg-accent-wash md:min-h-[62px]")}>
              <FlipbookThumb tint={row.tint} url={row.thumbnailUrl} className="max-md:row-span-2" />
              <div className="min-w-0">
                {row.hasPages ? (
                  <Link href={`/dashboard/flipbooks/${row.id}/editor`} className="block truncate font-serif text-[21px] tracking-[-0.3px] hover:text-accent">
                    {row.title}
                  </Link>
                ) : (
                  <span className="block truncate font-serif text-[21px] tracking-[-0.3px]">{row.title}</span>
                )}
                <div className="truncate text-[12.5px] text-muted">
                  {row.type === "CANVAS" ? "Canvas" : "PDF"} · {row.meta}
                </div>
              </div>
              <div className="max-md:col-start-2 max-md:row-start-2">
                <StatusBadge status={row.status} />
              </div>
              <div className="text-right text-sm tabular-nums max-md:hidden">{row.views}</div>
              <div className="text-right text-[13px] text-muted max-md:hidden">{row.updated}</div>
              <div className="flex shrink-0 justify-end gap-1.5 transition-opacity max-md:col-start-3 max-md:row-span-2 max-md:row-start-1 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                {row.hasPages ? (
                  <>
                    <ButtonLink href={`/dashboard/flipbooks/${row.id}/editor`} variant="secondary" size="xs" className="max-md:hidden">
                      Edit
                    </ButtonLink>
                    <Link href={`/f/${row.slug}`} className={iconButton} aria-label={`Preview ${row.title}`}>
                      <Eye className="size-3.5" strokeWidth={1.6} />
                    </Link>
                  </>
                ) : (
                  <>
                    <span className={buttonClasses({ variant: "secondary", size: "xs", className: "max-md:hidden" })} aria-disabled>
                      Edit
                    </span>
                    <span className={iconButton} aria-disabled>
                      <Eye className="size-3.5" strokeWidth={1.6} />
                    </span>
                  </>
                )}
                <RowMenu id={row.id} title={row.title} published={row.status === "PUBLISHED"} canRetry={row.status === "FAILED" && row.type === "PDF"} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
