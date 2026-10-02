import { ChartNoAxesColumn } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/dashboard/placeholder-page";
import { ButtonLink } from "@/components/ui/button";
import { segmentedFrame, segmentedItem } from "@/components/ui/tabs";
import { largestDropOff } from "@/lib/analytics/drop-off";
import { getAnalytics, getEntitlements, getFlipbook } from "@/lib/data";
import { formatCount, formatDuration, formatPercentDelta, formatShortDate } from "@/lib/format";
import { siteHost } from "@/lib/site";
import type { AnalyticsRange } from "@/lib/types";
import { cn } from "@/lib/utils";

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

// Desktop ink, mobile accent, tablet grey; anything else falls back in that order.
const DEVICE_STYLE: Record<string, { bar: string; text: string }> = {
  Desktop: { bar: "bg-ink", text: "text-ink" },
  Mobile: { bar: "bg-accent", text: "text-accent" },
  Tablet: { bar: "bg-placeholder", text: "text-muted" },
};
const DEVICE_FALLBACK = Object.values(DEVICE_STYLE);

export async function generateMetadata({ params }: PageProps<"/dashboard/flipbooks/[id]/analytics">): Promise<Metadata> {
  const flipbook = await getFlipbook((await params).id);
  return { title: flipbook ? `Analytics · ${flipbook.title}` : "Analytics" };
}

function Metric({ label, value, delta, positive }: { label: string; value: string; delta: string | null; positive: boolean }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5 pt-3.5 pr-[18px] pb-[18px]">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="font-serif text-[40px] leading-none tracking-[-1.2px] tabular-nums">{value}</span>
      <span className={cn("text-[12.5px] font-semibold", delta === null ? "font-normal text-faint" : positive ? "text-success" : "text-danger")}>
        {delta ? `${delta} vs previous` : "All time"}
      </span>
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
        action={<ButtonLink href="/dashboard/billing?upgrade=analytics" variant="primary">Upgrade to Pro</ButtonLink>}
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
    { label: "Views", value: formatCount(totals.views), delta: pct(deltas.views), positive: deltas.views >= 0 },
    { label: "Unique readers", value: formatCount(totals.uniqueVisitors), delta: pct(deltas.uniqueVisitors), positive: deltas.uniqueVisitors >= 0 },
    { label: "Page views", value: formatCount(totals.pageViews), delta: pct(deltas.pageViews), positive: deltas.pageViews >= 0 },
    {
      label: "Average read",
      value: formatDuration(totals.avgReadSeconds),
      delta: hasDeltas ? (deltas.avgReadSeconds >= 0 ? "+" : "") + formatDuration(deltas.avgReadSeconds) : null,
      positive: deltas.avgReadSeconds >= 0,
    },
    { label: "Shares", value: formatCount(totals.shares), delta: pct(deltas.shares), positive: deltas.shares >= 0 },
    { label: "PDF downloads", value: formatCount(totals.downloads), delta: pct(deltas.downloads), positive: deltas.downloads >= 0 },
  ];

  const bars = analytics.viewsPerPage.slice(0, 16);
  const maxViews = Math.max(...bars, 0);
  const hasPageViews = maxViews > 0;
  // The bar after the steepest drop is where readers leave.
  const drop = largestDropOff(bars);
  const dropAt = drop ? (drop.page / bars.length) * 100 : 0;
  const flip = dropAt > 55;

  return (
    <div className="flex max-w-[1240px] flex-col">
      <div className="flex flex-wrap items-end gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-[13px] text-muted">
            {siteHost}/f/{flipbook.slug}
            {flipbook.publishedAt && ` · published ${formatShortDate(flipbook.publishedAt)}`}
          </span>
          <h1 className="font-serif text-[40px] leading-none tracking-[-1.2px] break-words md:text-[56px] md:tracking-[-1.6px]">{flipbook.title}</h1>
        </div>
        <nav className={cn(segmentedFrame, "ml-auto")} aria-label="Date range">
          {RANGES.map((r) => (
            <Link
              key={r.value}
              href={`?range=${r.value}`}
              scroll={false}
              aria-current={r.value === range ? "true" : undefined}
              className={segmentedItem(r.value === range)}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-7 grid grid-cols-2 border-t border-ink border-b border-b-line sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map((m) => (
          <Metric key={m.label} {...m} />
        ))}
      </div>

      <div className="grid gap-14 pt-[30px] lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold">Views per page</h2>
            {bars.length > 0 && <span className="text-[12.5px] text-muted tabular-nums">Pages 1–{bars.length}</span>}
          </div>
          <div className="relative flex h-[260px] items-end gap-2 border-b border-ink max-sm:gap-1">
            {bars.map((views, i) => (
              <div
                key={i}
                title={`Page ${i + 1}: ${formatCount(views)} views`}
                className={cn("flex-1 hover:opacity-80", drop && i === drop.page ? "bg-accent" : "bg-ink")}
                style={{ height: hasPageViews ? `${(views / maxViews) * 100}%` : 0 }}
              />
            ))}
            {hasPageViews && drop && (
              <div
                className={cn("absolute top-6 flex max-w-[60%] flex-col gap-0.5 border-accent", flip ? "border-r pr-3 text-right" : "border-l pl-3")}
                style={flip ? { right: `${100 - dropAt}%` } : { left: `${dropAt}%` }}
              >
                <span className="font-serif text-[22px] leading-[1.1] tracking-[-0.4px] text-accent">
                  −{Math.round(drop.drop * 100)}% after page {drop.page}
                </span>
                <span className="text-[12.5px] text-ink-2">Try moving the call to action earlier.</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 max-sm:gap-1">
            {bars.map((_, i) => (
              <span key={i} className="flex-1 text-center text-[11px] text-faint tabular-nums">
                {i + 1}
              </span>
            ))}
          </div>
          {!hasPageViews && <p className="text-[13px] text-muted">No readers in this period yet.</p>}
        </section>

        <div className="flex min-w-0 flex-col gap-[30px]">
          <section className="flex flex-col gap-3">
            <h2 className="text-[15px] font-semibold">Devices</h2>
            {analytics.devices.length === 0 ? (
              <p className="text-[13px] text-muted">No readers yet.</p>
            ) : (
              <>
                <div className="flex h-2.5 gap-0.5">
                  {analytics.devices.map((d, i) => (
                    <div
                      key={d.name}
                      className={(DEVICE_STYLE[d.name] ?? DEVICE_FALLBACK[i % DEVICE_FALLBACK.length]).bar}
                      style={{ width: `${d.share * 100}%` }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
                  {analytics.devices.map((d, i) => (
                    <span key={d.name} className={(DEVICE_STYLE[d.name] ?? DEVICE_FALLBACK[i % DEVICE_FALLBACK.length]).text}>
                      {d.name} <b className="font-semibold tabular-nums">{Math.round(d.share * 100)}%</b>
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>
          <section className="flex flex-col">
            <h2 className="border-b border-ink pb-2 text-[15px] font-semibold">Top countries</h2>
            {analytics.countries.length === 0 && (
              <p className="pt-3 text-[13px] text-muted">Countries show when the site runs behind a CDN that reports them.</p>
            )}
            {analytics.countries.map((c) => (
              <div key={c.name} className="flex items-baseline justify-between border-b border-line py-[9px] text-sm">
                <span>{c.name}</span>
                <span className="tabular-nums">{formatCount(c.views)}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
