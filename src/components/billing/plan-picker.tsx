"use client";

import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { PLAN_FEATURES, PRO_PRICES } from "@/lib/billing/catalog";
import type { BillingInterval } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IntervalToggle } from "./interval-toggle";
import { UpgradeButton, type PaddleClientConfig } from "./upgrade-button";

type Props =
  /** Marketing site: both plans lead to sign-up; signed-in visitors are sent on to the app. */
  | { mode: "marketing" }
  /** Billing page on the free plan: Pro opens checkout. */
  | { mode: "billing"; paddle: PaddleClientConfig | null };

function Features({ items, onAccent }: { items: string[]; onAccent?: boolean }) {
  return (
    <ul className="mb-1 flex flex-col">
      {items.map((item) => (
        <li
          key={item}
          className={cn("flex items-center gap-2.5 border-b py-[9px] text-sm leading-snug", onAccent ? "border-white/[.18]" : "border-line")}
        >
          <Check className="size-4 shrink-0" strokeWidth={1.8} />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Free and Pro side by side under an ink rule; Pro is the solid accent column. */
export function PlanPicker(props: Props & { header?: ReactNode }) {
  const [interval, setBillingInterval] = useState<BillingInterval>("YEAR");
  const price = PRO_PRICES[interval];

  return (
    <div className="flex flex-col gap-[30px]">
      <div className="flex flex-wrap items-end gap-6">
        {props.header}
        <div className="ml-auto">
          <IntervalToggle value={interval} onChange={setBillingInterval} />
        </div>
      </div>
      <div className="grid border-t border-ink md:grid-cols-2">
        <section aria-labelledby="plan-free" className="flex flex-col gap-1.5 pt-[26px] pb-7 md:pr-9">
          <h3 id="plan-free" className="text-[13px] font-semibold">
            Free
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-[52px] leading-none tracking-[-1.5px]">$0</span>
            <span className="text-sm text-muted">forever</span>
          </div>
          <p className="mb-2.5 text-[13.5px] text-ink-2">Try everything on a few flipbooks, with the Flipbook badge.</p>
          <Features items={PLAN_FEATURES.FREE} />
          {props.mode === "marketing" ? (
            <div className="mt-auto pt-[18px]">
              <ButtonLink href="/register" variant="outline" className="h-[46px] w-full text-sm">
                Start free
              </ButtonLink>
            </div>
          ) : (
            <span className="mt-4 text-[13px] text-muted">Your current plan</span>
          )}
        </section>

        <section aria-labelledby="plan-pro" className="flex flex-col gap-1.5 bg-accent px-[clamp(20px,3vw,36px)] pt-[26px] pb-7 text-white">
          <h3 id="plan-pro" className="text-[13px] font-semibold">
            Pro
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-[52px] leading-none tracking-[-1.5px]" data-testid="pro-price">
              ${price.perMonth}
            </span>
            <span className="text-sm opacity-80">a month</span>
          </div>
          <p className="mb-2.5 text-[13.5px] opacity-85" data-testid="pro-billing">
            {interval === "YEAR" ? `$${price.amount} billed yearly` : "Billed monthly, cancel anytime"}
          </p>
          <Features items={PLAN_FEATURES.PRO} onAccent />
          <div className="mt-auto pt-[18px]">
            {props.mode === "marketing" ? (
              <ButtonLink href="/register?next=/dashboard/billing" variant="inverse" className="h-[46px] w-full text-sm font-bold">
                Get Pro
              </ButtonLink>
            ) : (
              <UpgradeButton interval={interval} paddle={props.paddle} variant="inverse" className="h-[46px] text-sm font-bold" errorClassName="text-white">
                Upgrade to Pro · ${price.amount}/{interval === "YEAR" ? "year" : "month"}
              </UpgradeButton>
            )}
            <p className="mt-2 text-center text-xs opacity-75">Secure checkout by Paddle · 14-day refund</p>
          </div>
        </section>
      </div>
    </div>
  );
}
