"use client";

import { Eye } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RowMenu } from "@/components/dashboard/row-menu";
import { StatusBadge, TypeBadge } from "@/components/ui/badges";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
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
  /** Processing and failed books have no pages to edit or view yet. */
  hasPages: boolean;
};

const FILTERS = [
  { label: "All", value: null },
  { label: "PDF", value: "PDF" },
  { label: "Canvas", value: "CANVAS" },
] as const;

export function FlipbookThumb({ tint }: { tint: [string, string] }) {
  return (
    <div
      className="relative h-[58px] w-11 shrink-0 overflow-hidden rounded border border-line"
      style={{ background: `linear-gradient(150deg, ${tint[0]}, ${tint[1]})` }}
    >
      <div className="absolute top-[9px] right-2.5 left-1.5 h-[3px] rounded-sm bg-[rgba(23,21,15,.22)]" />
      <div className="absolute top-4 right-4 left-1.5 h-[3px] rounded-sm bg-[rgba(23,21,15,.13)]" />
      <div className="absolute right-2 bottom-2 left-1.5 h-[18px] rounded-[3px] bg-[rgba(23,21,15,.08)]" />
    </div>
  );
}

export function EmptyFlipbooks() {
  return (
    <div className="px-6 py-[52px] text-center">
      <div className="relative mx-auto mb-4 h-[70px] w-14 rounded border-[1.5px] border-dashed border-line-strong">
        <div className="absolute top-3 right-2.5 left-2 h-[3px] rounded-sm bg-line" />
        <div className="absolute top-5 right-4 left-2 h-[3px] rounded-sm bg-track" />
      </div>
      <div className="text-sm font-semibold">No flipbooks yet</div>
      <p className="mx-auto mt-[7px] mb-4 max-w-80 text-[12.5px] leading-[1.55] text-pretty text-muted">
        Drop in a PDF and we&apos;ll render the pages, or start from a blank canvas.
      </p>
      <ButtonLink href="/dashboard/flipbooks/new" className="px-[17px] py-2.5">
        Create your first flipbook
      </ButtonLink>
    </div>
  );
}

const iconButton = buttonClasses({ variant: "secondary", className: "h-7 w-[30px] rounded-[7px] p-0" });

export function FlipbookTable({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: FlipbookRow[];
  /** Shown instead of the first-run empty state, e.g. for a search with no hits. */
  emptyMessage?: string;
}) {
  const [filter, setFilter] = useState<FlipbookType | null>(null);
  const visible = filter ? rows.filter((row) => row.type === filter) : rows;
  const message =
    rows.length === 0 ? emptyMessage : visible.length === 0 ? `No ${filter === "PDF" ? "PDF" : "canvas"} flipbooks yet.` : null;

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-3 border-b border-track px-[18px] py-4">
        <h2 className="text-[13.5px] font-semibold">{title}</h2>
        <div className="ml-auto flex gap-1" role="group" aria-label="Filter by type">
          {FILTERS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={cn(
                "rounded-md px-[9px] py-1 font-mono text-[11px] font-medium",
                filter === value ? "bg-paper text-ink" : "text-muted-2 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 && !emptyMessage && <EmptyFlipbooks />}
      {message && <div className="px-6 py-10 text-center text-[12.5px] text-muted">{message}</div>}

      {visible.map((row) => (
        <div
          key={row.id}
          className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-line-soft px-[18px] py-[13px] last:border-b-0 hover:bg-surface-sunken"
        >
          <FlipbookThumb tint={row.tint} />
          <div className="min-w-[140px] flex-[1_1_140px]">
            <div className="flex items-center gap-2">
              <span className="truncate text-[13.5px] font-semibold">{row.title}</span>
              <TypeBadge>{row.type}</TypeBadge>
            </div>
            <div className="mt-1 text-[11.5px] text-muted-2">{row.meta}</div>
          </div>
          <div className="ml-auto flex flex-[0_1_auto] items-center gap-3.5">
            <div className="shrink-0">
              <StatusBadge status={row.status} />
            </div>
            <div className="w-[60px] shrink-0 text-right font-mono text-xs font-medium">{row.views}</div>
            <div className="w-20 shrink-0 text-right text-[11.5px] text-muted-2">{row.updated}</div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            {row.hasPages ? (
              <>
                <ButtonLink href={`/dashboard/flipbooks/${row.id}/editor`} variant="secondary" size="xs">
                  Edit
                </ButtonLink>
                <Link href={`/f/${row.slug}`} className={iconButton} aria-label={`Preview ${row.title}`}>
                  <Eye className="size-3.5" strokeWidth={1.5} />
                </Link>
              </>
            ) : (
              <>
                <span className={buttonClasses({ variant: "secondary", size: "xs" })} aria-disabled>
                  Edit
                </span>
                <span className={iconButton} aria-disabled>
                  <Eye className="size-3.5" strokeWidth={1.5} />
                </span>
              </>
            )}
            <RowMenu id={row.id} title={row.title} published={row.status === "PUBLISHED"} />
          </div>
        </div>
      ))}
    </section>
  );
}
