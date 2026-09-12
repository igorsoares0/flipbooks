import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { LabeledMeter } from "@/components/ui/meter";
import { getBilling } from "@/lib/data";
import { featureList } from "@/lib/entitlements";
import { UPGRADE_MESSAGES } from "@/lib/entitlements/policy";
import { formatCompact, formatCount, formatGb, formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage({ searchParams }: PageProps<"/dashboard/billing">) {
  const { upgrade } = await searchParams;
  const { plan, purchasedAt, expiresAt, entitlements: ent, usage } = await getBilling();
  const upgradeMessage = typeof upgrade === "string" && upgrade in UPGRADE_MESSAGES
    ? UPGRADE_MESSAGES[upgrade as keyof typeof UPGRADE_MESSAGES]
    : null;

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
      {upgradeMessage && plan === "FREE" && (
        <p role="status" className="rounded-xl border border-accent/25 bg-accent-soft px-4 py-3 text-[13px] text-accent">
          <span className="font-semibold">{upgradeMessage}</span> Checkout opens with the Lifetime Deal launch.
        </p>
      )}
      <section className="flex flex-wrap items-center gap-6 rounded-[18px] bg-ink px-[30px] py-7 text-on-dark">
        <div className="min-w-[min(260px,100%)] flex-1">
          <div className="label-mono tracking-[.1em] text-on-dark-dim-2">CURRENT PLAN</div>
          <h1 className="mt-2.5 mb-2 font-serif text-[40px] leading-[1.05] tracking-[-1px]">
            {plan === "LIFETIME" ? "Lifetime Deal" : "Free"}
          </h1>
          <p className="max-w-[420px] text-[13px] leading-[1.55] text-pretty text-on-dark-dim">
            {plan === "LIFETIME" ? (
              <>
                Paid once{purchasedAt ? ` on ${formatLongDate(purchasedAt)}` : ""}. Entitlement{" "}
                <span className="font-mono text-xs text-on-dark">{plan}</span>,{" "}
                {expiresAt ? `expires ${formatLongDate(expiresAt)}` : "no expiry"}.
              </>
            ) : (
              "Publish PDF flipbooks with the Flipbook badge. The Lifetime Deal unlocks the canvas editor, analytics, custom addresses and removing the badge."
            )}
          </p>
        </div>
        {/* Paddle checkout and the customer portal arrive with the billing phase. */}
        <div className="flex flex-col gap-2">
          {plan === "LIFETIME" ? (
            <>
              <Button variant="light" className="px-[18px] py-2.5 text-[13px]">
                Manage in Paddle
              </Button>
              <Button variant="dark-outline" className="px-[18px] py-2.5 text-[13px]">
                Download invoices
              </Button>
            </>
          ) : (
            <Button variant="light" className="px-[18px] py-2.5 text-[13px]">
              Get the Lifetime Deal · $79
            </Button>
          )}
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
          {featureList(ent).map((f) => (
            <span
              key={f.label}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[20px] border border-line bg-surface-sunken px-[11px] py-[5px] text-[11.5px] whitespace-nowrap",
                !f.enabled && "text-muted-3",
              )}
            >
              <span className={cn("size-[5px] rounded-full", f.enabled ? "bg-success" : "bg-line-strong")} />
              {f.label}
              {!f.enabled && <span className="sr-only"> (not included)</span>}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
