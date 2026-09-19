import { ChartNoAxesColumn } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/dashboard/placeholder-page";
import { ButtonLink } from "@/components/ui/button";
import { getAnalytics, getEntitlements, getFlipbook } from "@/lib/data";
import { formatCount, formatDuration, formatPercentDelta, formatShortDate } from "@/lib/format";
import { siteHost } from "@/lib/site";
import type { AnalyticsRange } from "@/lib/types";
import { cn } from "@/lib/utils";

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
];

const DEVICE_COLORS = ["bg-ink", "bg-accent", "bg-warning"];

export async function generateMetadata({ params }: PageProps<"/dashboard/flipbooks/[id]/analytics">): Promise<Metadata> {
  const flipbook = await getFlipbook((await params).id);
  return { title: flipbook ? `Analytics · ${flipbook.title}` : "Analytics" };
}

function MetricCard({ label, value, delta, positive }: { label: string; value: string; delta: string | null; positive: boolean }) {
  return (
    <div role="group" aria-label={label} className="rounded-[13px] border border-line bg-surface px-4 py-[15px]">
      <div className="font-mono text-[10px] font-medium tracking-[.06em] text-muted-2" aria-hidden>
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.6px]">{value}</div>
      <div className={cn("mt-1 text-[11px]", delta === null ? "text-muted-3" : positive ? "text-success" : "text-danger")}>
        {delta ?? "All time"}
      </div>
    </div>
  );
}

export default async function AnalyticsPage({ params, searchParams }: PageProps<"/dashboard/flipbooks/[id]/analytics">) {
  const { id } = await params;
  const { range: rangeParam } = await searchParams;
  const range = RANGES.find((r) => r.value === rangeParam)?.value ?? "30d";

  const flipbook = await getFlipbook(id);
  if (!flipbook) notFound();

  if (!(await getEntitlements()).canUseAnalytics) {
    return (
      <PlaceholderPage
        icon={ChartNoAxesColumn}
        title="Analytics are part of Pro"
        body="See views, reading time, per-page drop-off, devices and countries for every flipbook. Readers are already being counted, so upgrading shows your history."
        action={<ButtonLink href="/dashboard/billing?upgrade=analytics">Upgrade to Pro</ButtonLink>}
      />
    );
  }

  const analytics = await getAnalytics(id, range);

  if (!analytics) {
    return (
      <PlaceholderPage
        icon={ChartNoAxesColumn}
        title={`No analytics for ${flipbook.title} yet`}
        body="Analytics start collecting as soon as the flipbook is published."
      />
    );
  }

  const { totals, deltas } = analytics;
  const hasDeltas = range !== "all";
  const pct = (v: number) => (hasDeltas ? formatPercentDelta(v) : null);
  const metrics = [
    { label: "VIEWS", value: formatCount(totals.views), delta: pct(deltas.views), positive: deltas.views >= 0 },
    { label: "UNIQUE", value: formatCount(totals.uniqueVisitors), delta: pct(deltas.uniqueVisitors), positive: deltas.uniqueVisitors >= 0 },
    { label: "PAGE VIEWS", value: formatCount(totals.pageViews), delta: pct(deltas.pageViews), positive: deltas.pageViews >= 0 },
    {
      label: "AVG. TIME",
      value: formatDuration(totals.avgReadSeconds),
      delta: hasDeltas ? (deltas.avgReadSeconds >= 0 ? "+" : "") + formatDuration(deltas.avgReadSeconds) : null,
      positive: deltas.avgReadSeconds >= 0,
    },
    { label: "SHARES", value: formatCount(totals.shares), delta: pct(deltas.shares), positive: deltas.shares >= 0 },
    { label: "DOWNLOADS", value: formatCount(totals.downloads), delta: pct(deltas.downloads), positive: deltas.downloads >= 0 },
  ];

  // The bar after the steepest drop is where readers leave.
  const bars = analytics.viewsPerPage.slice(0, 16);
  const maxViews = Math.max(...bars, 0);
  const hasPageViews = maxViews > 0;
  let dropIndex = 1;
  for (let i = 1; i < bars.length; i++) {
    if (bars[i - 1] - bars[i] > bars[dropIndex - 1] - bars[dropIndex]) dropIndex = i;
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-[18px]">
      <div className="flex flex-wrap items-end gap-3.5">
        <div className="min-w-0">
          <div className="label-mono text-muted-2">FLIPBOOK</div>
          <h1 className="mt-1.5 font-serif text-[30px] leading-[1.1] tracking-[-0.5px]">{flipbook.title}</h1>
          <div className="mt-[5px] text-[12.5px] text-muted">
            {siteHost}/f/{flipbook.slug}
            {flipbook.publishedAt && ` · published ${formatShortDate(flipbook.publishedAt)}`}
          </div>
        </div>
        <nav className="ml-auto flex gap-1 rounded-[9px] border border-line bg-surface p-[3px]" aria-label="Date range">
          {RANGES.map((r) => (
            <Link
              key={r.value}
              href={`?range=${r.value}`}
              scroll={false}
              aria-current={r.value === range ? "true" : undefined}
              className={cn(
                "rounded-md px-[11px] py-1.5 font-mono text-[11.5px] font-medium",
                r.value === range ? "bg-paper text-ink" : "text-muted-2 hover:text-ink",
              )}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <section className="min-w-0 flex-[1_1_420px] rounded-2xl border border-line bg-surface p-[18px]">
          <h2 className="mb-4 text-[13px] font-semibold">Views per page</h2>
          <div className="flex h-[180px] items-end gap-1.5">
            {bars.map((views, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                <div
                  title={`Page ${i + 1}: ${formatCount(views)} views`}
                  className={cn(
                    "w-full max-w-[26px] rounded-t-[3px] hover:bg-accent hover:opacity-100",
                    i === dropIndex ? "bg-warning" : "bg-ink opacity-[.82]",
                  )}
                  style={{ height: hasPageViews ? Math.round((views / maxViews) * 150) : 0 }}
                />
                <span className="font-mono text-[9px] font-medium text-muted-3">{i + 1}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-muted-2">
            {!hasPageViews
              ? "No readers in this period yet."
              : bars.length > 1
                ? `Drop-off after page ${dropIndex} — consider moving the CTA earlier.`
                : "Views of the first page."}
          </p>
        </section>

        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-4">
          <section className="rounded-2xl border border-line bg-surface p-[18px]">
            <h2 className="mb-3.5 text-[13px] font-semibold">Devices</h2>
            {analytics.devices.length === 0 && <p className="text-[12px] text-muted-2">No readers yet.</p>}
            {analytics.devices.map((d, i) => (
              <div key={d.name} className="mb-3 last:mb-0">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span>{d.name}</span>
                  <span className="font-mono text-[11px] font-medium text-muted">{Math.round(d.share * 100)}%</span>
                </div>
                <div className="h-[5px] overflow-hidden rounded-[3px] bg-track">
                  <div className={cn("h-full", DEVICE_COLORS[i % DEVICE_COLORS.length])} style={{ width: `${d.share * 100}%` }} />
                </div>
              </div>
            ))}
          </section>
          <section className="rounded-2xl border border-line bg-surface p-[18px]">
            <h2 className="mb-3 text-[13px] font-semibold">Top countries</h2>
            {analytics.countries.length === 0 && (
              <p className="text-[12px] text-muted-2">Countries show when the site runs behind a CDN that reports them.</p>
            )}
            {analytics.countries.map((c) => (
              <div key={c.name} className="flex justify-between border-b border-line-soft py-[7px] text-[12.5px] last:border-b-0">
                <span>{c.name}</span>
                <span className="font-mono text-[11.5px] font-medium text-muted">{formatCount(c.views)}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
