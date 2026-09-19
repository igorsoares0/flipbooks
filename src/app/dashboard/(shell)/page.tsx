import type { Metadata } from "next";
import { toFlipbookRows } from "@/components/dashboard/flipbook-rows";
import { FlipbookTable } from "@/components/dashboard/flipbook-table";
import { ProcessingWatcher } from "@/components/dashboard/processing-watcher";
import { getBilling, getDashboardStats, getRecentFlipbooks } from "@/lib/data";
import { formatCompact, formatDuration, formatGb, formatPercentDelta } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[14px] border border-line bg-surface px-[18px] pt-[18px] pb-4">
      <div className="label-mono text-muted-2">{label}</div>
      <div className="mt-2.5 font-serif text-[38px] leading-[1.05] tracking-[-1px]">{value}</div>
      <div className="mt-1.5 text-[11.5px] text-muted">{sub}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const [stats, recent, billing] = await Promise.all([getDashboardStats(), getRecentFlipbooks(), getBilling()]);
  const hasReaders = stats.totalViews > 0;
  const planName = billing.plan === "PRO" ? "Pro" : "the Free plan";

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      <ProcessingWatcher active={recent.some((fb) => fb.status === "UPLOADING" || fb.status === "PROCESSING")} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
        <StatCard
          label="FLIPBOOKS"
          value={String(stats.flipbookCount)}
          sub={`${stats.publishedThisMonth} published this month`}
        />
        <StatCard
          label="TOTAL VIEWS"
          value={formatCompact(stats.totalViews)}
          sub={
            stats.viewsDelta
              ? `${formatPercentDelta(stats.viewsDelta)} vs last 30 days`
              : hasReaders
                ? "Across all your flipbooks"
                : "Publish a flipbook to start counting"
          }
        />
        {/* Average reading time per visit over the last 30 days; nothing to show without readers. */}
        <StatCard
          label="AVG. READ TIME"
          value={hasReaders ? formatDuration(stats.avgReadSeconds) : "—"}
          sub={hasReaders ? "Per visit, last 30 days" : "No readers yet"}
        />
        <StatCard
          label="STORAGE"
          value={formatGb(stats.storageBytes)}
          sub={`GB of ${formatGb(stats.storageLimitBytes)} GB on ${planName}`}
        />
      </div>

      <FlipbookTable title="Recent flipbooks" rows={toFlipbookRows(recent)} />
    </div>
  );
}
