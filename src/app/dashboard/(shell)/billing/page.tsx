import { Check } from "lucide-react";
import type { Metadata } from "next";
import { ActivatingPro, ManagePlan } from "@/components/billing/manage-plan";
import { PlanPicker } from "@/components/billing/plan-picker";
import type { PaddleClientConfig } from "@/components/billing/upgrade-button";
import { LabeledMeter } from "@/components/ui/meter";
import { PLAN_FEATURES, PRO_PRICES } from "@/lib/billing/catalog";
import { getBilling } from "@/lib/data";
import { UPGRADE_MESSAGES } from "@/lib/entitlements/policy";
import { formatCompact, formatCount, formatGb, formatLongDate } from "@/lib/format";
import type { Billing } from "@/lib/types";

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
    { label: "Flipbooks", value: formatCount(usage.flipbooks), of: `of ${formatCount(ent.maxFlipbooks)}`, ratio: usage.flipbooks / ent.maxFlipbooks },
    {
      label: "Storage",
      value: formatGb(usage.storageBytes),
      of: `of ${formatGb(ent.maxStorageBytes)} GB`,
      ratio: usage.storageBytes / ent.maxStorageBytes,
    },
    {
      label: "Views this month",
      value: formatCompact(usage.monthlyViews),
      of: `of ${formatCompact(ent.maxMonthlyViews)}`,
      ratio: usage.monthlyViews / ent.maxMonthlyViews,
      // A soft limit: readers are never turned away, so going over is only flagged.
      barClassName: usage.monthlyViews > ent.maxMonthlyViews ? "bg-warning" : undefined,
    },
  ];
  const usageLine = [
    `${formatCount(usage.flipbooks)} of ${formatCount(ent.maxFlipbooks)} flipbooks`,
    `${formatGb(usage.storageBytes)} of ${formatGb(ent.maxStorageBytes)} GB`,
    `${formatCompact(usage.monthlyViews)} of ${formatCompact(ent.maxMonthlyViews)} views this month`,
  ].join(" · ");
  const interval = plan === "PRO" && subscription?.managedByPaddle ? subscription.interval : null;

  return (
    <div className="flex max-w-[1180px] flex-col gap-10">
      <ActivatingPro active={checkout === "success" && plan === "FREE"} />
      {upgradeMessage && plan === "FREE" && (
        <p role="status" className="bg-accent-tint px-4 py-3 text-[13.5px] text-accent">
          <span className="font-semibold">{upgradeMessage}</span> Pick a plan below.
        </p>
      )}
      {pastDue && (
        <p role="alert" className="bg-danger-bg px-4 py-3 text-[13.5px] text-danger-ink">
          <span className="font-bold">Your last payment didn&apos;t go through.</span> Pro stays on while Paddle retries. Update your
          payment method under Manage subscription.
        </p>
      )}

      {plan === "FREE" ? (
        <PlanPicker
          mode="billing"
          paddle={paddleClientConfig()}
          header={
            <div className="flex flex-col gap-2.5">
              <span className="text-[13px] font-semibold text-accent">Current plan</span>
              <h1 className="font-serif text-[52px] leading-[.95] tracking-[-1.6px] md:text-[64px] md:tracking-[-2px]">Free</h1>
              <p className="text-[15px] text-ink-2">{usageLine}</p>
            </div>
          }
        />
      ) : (
        <>
          <section className="flex flex-wrap items-end gap-6 border-b border-ink pb-9">
            <div className="flex min-w-0 flex-col gap-2.5">
              <span className="text-[13px] font-semibold text-accent">Current plan</span>
              <h1 className="font-serif text-[52px] leading-[.95] tracking-[-1.6px] md:text-[72px] md:tracking-[-2.4px]">
                Pro{interval && <em>, {interval === "YEAR" ? "yearly" : "monthly"}</em>}
              </h1>
              <p className="max-w-[520px] text-[15px] text-pretty text-ink-2">{planSummary(billing)}</p>
            </div>
            {subscription?.managedByPaddle && (
              <div className="ml-auto">
                <ManagePlan interval={subscription.interval} canSwitch={!subscription.cancelAtPeriodEnd && !pastDue} />
              </div>
            )}
          </section>

          <section aria-labelledby="usage-heading" className="flex flex-col gap-[18px]">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 id="usage-heading" className="font-serif text-[30px] leading-none tracking-[-0.8px]">
                Usage
              </h2>
              <span className="text-[13px] text-muted">Views are counted, never blocked.</span>
            </div>
            <div className="grid gap-10 sm:grid-cols-3">
              {meters.map((m) => (
                <div key={m.label} className="border-t border-ink pt-3">
                  <LabeledMeter {...m} />
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="included-heading" className="flex flex-col gap-3.5">
            <h2 id="included-heading" className="font-serif text-[30px] leading-none tracking-[-0.8px]">
              Included
            </h2>
            <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {PLAN_FEATURES.PRO.filter((f) => f !== "Everything in Free").map((f) => (
                <li key={f} className="flex items-center gap-2.5 border-b border-line py-[11px] text-sm">
                  <Check className="size-4 shrink-0" strokeWidth={1.8} />
                  {f}
                </li>
              ))}
            </ul>
          </section>
          <p className="text-[12.5px] text-muted">Payments, taxes and receipts are handled by Paddle.</p>
        </>
      )}
    </div>
  );
}
