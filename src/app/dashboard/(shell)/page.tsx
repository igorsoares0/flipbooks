import { Search } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { toFlipbookRows } from "@/components/dashboard/flipbook-rows";
import { FlipbookTable } from "@/components/dashboard/flipbook-table";
import { ProcessingWatcher } from "@/components/dashboard/processing-watcher";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { getBilling, getCurrentUser, getFlipbookPage } from "@/lib/data";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Flipbooks" };

/** First run: nothing to list yet, so the page is one invitation to start. */
function Welcome({ firstName, limits }: { firstName: string; limits: string }) {
  return (
    <section className="grid gap-10 border-b border-ink pb-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-14">
      <div className="flex flex-col items-start gap-5">
        <span className="text-[13px] font-semibold text-accent">Welcome, {firstName}</span>
        <h1 className="font-serif text-[44px] leading-[0.98] tracking-[-1.4px] md:text-[64px] md:tracking-[-2px]">
          Your first issue <em className="text-accent">starts here.</em>
        </h1>
        <p className="max-w-[520px] text-[16.5px] leading-[1.55] text-ink-2">
          Drop in a PDF and we&apos;ll render the pages, or open a blank book and design it yourself.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <ButtonLink href="/dashboard/flipbooks/new" variant="primary" className="h-[42px] px-5 text-sm">
            Upload a PDF
          </ButtonLink>
          <ButtonLink href="/dashboard/templates" variant="outline" className="h-[42px] px-5 text-sm">
            Start from a template
          </ButtonLink>
        </div>
      </div>
      <div className="flex items-end gap-3.5 max-sm:flex-wrap">
        <div className="aspect-[3/4] w-[150px] border-[1.5px] border-dashed border-placeholder" />
        <div className="aspect-[3/4] w-[150px] border-[1.5px] border-dashed border-line-2 max-sm:hidden" />
        <p className="pb-1 text-[13px] leading-normal text-muted">{limits}</p>
      </div>
    </section>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { q, page: pageParam } = await searchParams;
  const query = typeof q === "string" ? q : undefined;
  const requested = Math.max(1, Math.floor(Number(pageParam)) || 1);
  const { flipbooks, total, page, perPage, pageCount } = await getFlipbookPage({ query, page: requested });

  if (total === 0 && !query) {
    const [user, billing] = await Promise.all([getCurrentUser(), getBilling()]);
    const plan = billing.plan === "PRO" ? "Pro plan" : "Free plan";
    const limits = `${plan} · ${formatCount(billing.entitlements.maxFlipbooks)} flipbooks, ${formatCount(billing.entitlements.maxPagesPerFlipbook)} pages each`;
    return <Welcome firstName={user.name.split(/\s+/)[0] || user.name} limits={limits} />;
  }

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
          <Form action="/dashboard" className="relative flex w-60 items-center">
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
