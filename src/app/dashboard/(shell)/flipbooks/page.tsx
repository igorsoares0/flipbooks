import { Search } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { toFlipbookRows } from "@/components/dashboard/flipbook-rows";
import { FlipbookTable } from "@/components/dashboard/flipbook-table";
import { ProcessingWatcher } from "@/components/dashboard/processing-watcher";
import { getFlipbookPage } from "@/lib/data";
import { formatCount } from "@/lib/format";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Flipbooks" };

export default async function FlipbooksPage({ searchParams }: PageProps<"/dashboard/flipbooks">) {
  const { q, page: pageParam } = await searchParams;
  const query = typeof q === "string" ? q : undefined;
  const requested = Math.max(1, Math.floor(Number(pageParam)) || 1);
  const { flipbooks, total, page, perPage, pageCount } = await getFlipbookPage({ query, page: requested });

  const href = (target: number) => ({ query: { ...(query ? { q: query } : {}), ...(target > 1 ? { page: target } : {}) } });
  const first = total === 0 ? 0 : (page - 1) * perPage + 1;
  const pager = buttonClasses({ variant: "outline", size: "sm" });

  return (
    <div className="flex max-w-[1180px] flex-col gap-6">
      <h1 className="font-serif text-[40px] leading-none tracking-[-1.2px] md:text-[52px] md:tracking-[-1.6px]">Flipbooks</h1>
      <ProcessingWatcher active={flipbooks.some((fb) => fb.status === "UPLOADING" || fb.status === "PROCESSING")} />
      {query && (
        <p className="text-[13.5px] text-muted">
          {formatCount(total)} result{total === 1 ? "" : "s"} for <span className="font-semibold text-ink">“{query}”</span>
        </p>
      )}
      <FlipbookTable
        title={query ? "Search results" : "All flipbooks"}
        rows={toFlipbookRows(flipbooks)}
        emptyMessage={query ? "No flipbooks match that search." : undefined}
        actions={
          <Form action="/dashboard/flipbooks" className="relative flex w-60 items-center">
            <Search className="pointer-events-none absolute left-0 size-4 opacity-55" strokeWidth={1.6} />
            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search flipbooks"
              aria-label="Search flipbooks"
              className="input-line h-9 pl-6 text-[14px]"
            />
          </Form>
        }
      />
      {pageCount > 1 && (
        <nav className="flex items-center gap-3" aria-label="Pages">
          <span className="text-[13px] text-muted tabular-nums">
            {formatCount(first)}–{formatCount(first + flipbooks.length - 1)} of {formatCount(total)}
          </span>
          <div className="ml-auto flex gap-2">
            <Link href={href(page - 1)} aria-disabled={page === 1} className={cn(pager, page === 1 && "pointer-events-none opacity-40")}>
              Previous
            </Link>
            <Link
              href={href(page + 1)}
              aria-disabled={page >= pageCount}
              className={cn(pager, page >= pageCount && "pointer-events-none opacity-40")}
            >
              Next
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
