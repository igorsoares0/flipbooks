import type { Metadata } from "next";
import Link from "next/link";
import { toFlipbookRows } from "@/components/dashboard/flipbook-rows";
import { FlipbookTable } from "@/components/dashboard/flipbook-table";
import { ProcessingWatcher } from "@/components/dashboard/processing-watcher";
import { ButtonLink } from "@/components/ui/button";
import { getBilling, getCurrentUser, getFlipbookPage } from "@/lib/data";
import { formatCount } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

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

export default async function DashboardPage() {
  const [user, billing, { flipbooks, total }] = await Promise.all([getCurrentUser(), getBilling(), getFlipbookPage({})]);
  const { entitlements } = billing;

  if (total === 0) {
    const plan = billing.plan === "PRO" ? "Pro plan" : "Free plan";
    const limits = `${plan} · ${formatCount(entitlements.maxFlipbooks)} flipbooks, ${formatCount(entitlements.maxPagesPerFlipbook)} pages each`;
    return <Welcome firstName={user.name.split(/\s+/)[0] || user.name} limits={limits} />;
  }

  return (
    <div className="flex max-w-[1180px] flex-col gap-6">
      <h1 className="sr-only">Dashboard</h1>
      <ProcessingWatcher active={flipbooks.some((fb) => fb.status === "UPLOADING" || fb.status === "PROCESSING")} />
      <FlipbookTable title="Contents" rows={toFlipbookRows(flipbooks)} />
      {total > flipbooks.length && (
        <Link href="/dashboard/flipbooks" className="self-start text-[13.5px] font-semibold text-accent underline underline-offset-[3px] hover:text-ink">
          All {formatCount(total)} flipbooks
        </Link>
      )}
    </div>
  );
}
