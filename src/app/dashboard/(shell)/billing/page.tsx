import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { LabeledMeter } from "@/components/ui/meter";
import { getBilling } from "@/lib/data";
import { featureList } from "@/lib/entitlements";
import { formatCompact, formatCount, formatGb, formatLongDate } from "@/lib/format";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const { plan, purchasedAt, expiresAt, entitlements: ent, usage } = await getBilling();

  const meters = [
    {
      label: "Storage",
      value: `${formatGb(usage.storageBytes)} / ${formatGb(ent.maxStorageBytes)} GB`,
      ratio: usage.storageBytes / ent.maxStorageBytes,
    },
    {
      label: "Pages processed",
      value: `${formatCount(usage.pagesProcessed)} / ${formatCount(ent.maxPagesProcessed)}`,
      ratio: usage.pagesProcessed / ent.maxPagesProcessed,
    },
    {
      label: "Monthly views",
      value: `${formatCompact(usage.monthlyViews)} / ${formatCompact(ent.maxMonthlyViews)}`,
      ratio: usage.monthlyViews / ent.maxMonthlyViews,
    },
    {
      label: "Bandwidth",
      value: `${formatGb(usage.bandwidthBytes)} / ${formatGb(ent.maxBandwidthBytes)} GB`,
      ratio: usage.bandwidthBytes / ent.maxBandwidthBytes,
      // Bandwidth is the metered cost on the LTD, so it is always flagged in amber.
      barClassName: "bg-warning",
    },
  ];

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-[18px]">
      <section className="flex flex-wrap items-center gap-6 rounded-[18px] bg-ink px-[30px] py-7 text-on-dark">
        <div className="min-w-[min(260px,100%)] flex-1">
          <div className="label-mono tracking-[.1em] text-on-dark-dim-2">CURRENT PLAN</div>
          <h1 className="mt-2.5 mb-2 font-serif text-[40px] leading-[1.05] tracking-[-1px]">
            {plan === "LIFETIME" ? "Lifetime Deal" : "Free"}
          </h1>
          <p className="max-w-[420px] text-[13px] leading-[1.55] text-pretty text-on-dark-dim">
            Paid once via Paddle on {formatLongDate(purchasedAt)}. Entitlement{" "}
            <span className="font-mono text-xs text-on-dark">{plan}</span>, {expiresAt ? `expires ${formatLongDate(expiresAt)}` : "no expiry"}.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="light" className="px-[18px] py-2.5 text-[13px]">
            Manage in Paddle
          </Button>
          <Button variant="dark-outline" className="px-[18px] py-2.5 text-[13px]">
            Download invoices
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface px-[22px] py-5">
        <h2 className="mb-1 text-[13.5px] font-semibold">Entitlements</h2>
        <p className="mb-4 text-xs text-muted-2">Limits are enforced server-side on every request.</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
          {meters.map((m) => (
            <LabeledMeter key={m.label} {...m} />
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {featureList(ent)
            .filter((f) => f.enabled)
            .map((f) => (
              <span
                key={f.label}
                className="inline-flex items-center gap-1.5 rounded-[20px] border border-line bg-surface-sunken px-[11px] py-[5px] text-[11.5px] whitespace-nowrap"
              >
                <span className="size-[5px] rounded-full bg-success" />
                {f.label}
              </span>
            ))}
        </div>
      </section>
    </div>
  );
}
