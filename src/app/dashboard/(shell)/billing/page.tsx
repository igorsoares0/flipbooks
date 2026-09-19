import type { Metadata } from "next";
import { ActivatingPro, ManagePlan } from "@/components/billing/manage-plan";
import { PlanPicker } from "@/components/billing/plan-picker";
import type { PaddleClientConfig } from "@/components/billing/upgrade-button";
import { LabeledMeter } from "@/components/ui/meter";
import { PRO_PRICES } from "@/lib/billing/catalog";
import { getBilling } from "@/lib/data";
import { featureList } from "@/lib/entitlements";
import { UPGRADE_MESSAGES } from "@/lib/entitlements/policy";
import { formatCompact, formatCount, formatGb, formatLongDate } from "@/lib/format";
import type { Billing } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Billing" };

function paddleClientConfig(): PaddleClientConfig | null {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token || !process.env.PADDLE_PRICE_PRO_MONTH || !process.env.PADDLE_PRICE_PRO_YEAR) return null;
  return { token, environment: process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox" };
}

function planSummary({ plan, subscription }: Billing): string {
  if (plan === "FREE") return "Up to 3 flipbooks with the Flipbook badge. Pro removes the badge and adds analytics, custom addresses and room for 100 flipbooks.";
  if (!subscription?.managedByPaddle) return "Pro, granted by Flipbook. No payment needed.";
  const period = subscription.interval === "YEAR" ? `$${PRO_PRICES.YEAR.amount} a year` : `$${PRO_PRICES.MONTH.amount} a month`;
  const date = subscription.currentPeriodEnd ? formatLongDate(subscription.currentPeriodEnd) : null;
  if (subscription.cancelAtPeriodEnd) return `Cancelled. Pro stays on until ${date ?? "the end of the period"}, then your account moves to Free. Nothing is deleted.`;
  return `${period}.${date ? ` Renews on ${date}.` : ""}`;
}

export default async function BillingPage({ searchParams }: PageProps<"/dashboard/billing">) {
  const { upgrade, checkout } = await searchParams;
  const billing = await getBilling();
  const { plan, subscription, entitlements: ent, usage } = billing;
  const upgradeMessage =
    typeof upgrade === "string" && upgrade in UPGRADE_MESSAGES ? UPGRADE_MESSAGES[upgrade as keyof typeof UPGRADE_MESSAGES] : null;
  const pastDue = subscription?.status === "PAST_DUE";

  const meters = [
    {
      label: "Flipbooks",
      value: `${formatCount(usage.flipbooks)} / ${formatCount(ent.maxFlipbooks)}`,
      ratio: usage.flipbooks / ent.maxFlipbooks,
    },
    {
      label: "Storage",
      value: `${formatGb(usage.storageBytes)} / ${formatGb(ent.maxStorageBytes)} GB`,
      ratio: usage.storageBytes / ent.maxStorageBytes,
    },
    {
      label: "Views this month",
      value: `${formatCompact(usage.monthlyViews)} / ${formatCompact(ent.maxMonthlyViews)}`,
      ratio: usage.monthlyViews / ent.maxMonthlyViews,
      // A soft limit: readers are never turned away, so going over is only flagged.
      barClassName: usage.monthlyViews > ent.maxMonthlyViews ? "bg-warning" : undefined,
    },
  ];

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-[18px]">
      <ActivatingPro active={checkout === "success" && plan === "FREE"} />
      {upgradeMessage && plan === "FREE" && (
        <p role="status" className="rounded-xl border border-accent/25 bg-accent-soft px-4 py-3 text-[13px] text-accent">
          <span className="font-semibold">{upgradeMessage}</span> Pick a plan below.
        </p>
      )}
      {pastDue && (
        <p role="alert" className="rounded-xl border border-danger-line bg-danger-tint px-4 py-3 text-[13px] text-danger">
          <span className="font-semibold">Your last payment didn&apos;t go through.</span> Pro stays on while Paddle retries. Update your
          payment method under Manage subscription.
        </p>
      )}

      <section className="flex flex-wrap items-center gap-6 rounded-[18px] bg-ink px-[30px] py-7 text-on-dark">
        <div className="min-w-[min(260px,100%)] flex-1">
          <div className="label-mono tracking-[.1em] text-on-dark-dim-2">CURRENT PLAN</div>
          <h1 className="mt-2.5 mb-2 font-serif text-[40px] leading-[1.05] tracking-[-1px]">{plan === "PRO" ? "Pro" : "Free"}</h1>
          <p className="max-w-[440px] text-[13px] leading-[1.55] text-pretty text-on-dark-dim">{planSummary(billing)}</p>
        </div>
        {plan === "PRO" && subscription?.managedByPaddle && (
          <ManagePlan interval={subscription.interval} canSwitch={!subscription.cancelAtPeriodEnd && !pastDue} />
        )}
      </section>

      {plan === "FREE" && (
        <section aria-labelledby="upgrade-heading" className="flex flex-col gap-4">
          <h2 id="upgrade-heading" className="text-[13.5px] font-semibold">
            Upgrade to Pro
          </h2>
          <PlanPicker mode="billing" paddle={paddleClientConfig()} />
        </section>
      )}

      <section className="rounded-2xl border border-line bg-surface px-[22px] py-5">
        <h2 className="mb-1 text-[13.5px] font-semibold">Usage</h2>
        <p className="mb-4 text-xs text-muted-2">Limits are enforced when you create or upload. Views are counted but never blocked.</p>
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
