"use client";

import { Check } from "lucide-react";
import { useState } from "react";
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

function Features({ items, dark }: { items: string[]; dark?: boolean }) {
  return (
    <ul className="mt-5 flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className={cn("flex items-start gap-2.5 text-[13px] leading-normal", dark ? "text-line" : "text-ink-70")}>
          <span
            className={cn(
              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
              dark ? "bg-[#243B8E] text-white" : "bg-accent-soft text-accent",
            )}
          >
            <Check className="size-2.5" strokeWidth={3} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function PlanPicker(props: Props) {
  const [interval, setBillingInterval] = useState<BillingInterval>("YEAR");
  const price = PRO_PRICES[interval];

  return (
    <div className="flex flex-col items-center gap-6">
      <IntervalToggle value={interval} onChange={setBillingInterval} />
      <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
        <section aria-labelledby="plan-free" className="flex flex-col rounded-[20px] border border-line bg-surface p-[clamp(22px,3vw,32px)]">
          <h3 id="plan-free" className="label-mono text-muted-2">
            FREE
          </h3>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-[52px] leading-none tracking-[-1.5px]">$0</span>
            <span className="text-[13px] text-muted">forever</span>
          </div>
          <p className="mt-2 text-[13px] text-muted">Try everything on a few flipbooks, with the Flipbook badge.</p>
          <Features items={PLAN_FEATURES.FREE} />
          {props.mode === "marketing" && (
            <div className="mt-auto pt-6">
              <ButtonLink href="/register" variant="outline" className="w-full">
                Start free
              </ButtonLink>
            </div>
          )}
        </section>

        <section aria-labelledby="plan-pro" className="flex flex-col rounded-[20px] bg-ink p-[clamp(22px,3vw,32px)] text-on-dark">
          <div className="flex items-center justify-between">
            <h3 id="plan-pro" className="label-mono text-on-dark-dim-2">
              PRO
            </h3>
            {interval === "YEAR" && <span className="rounded-full bg-success px-2 py-0.5 text-[10.5px] font-semibold text-white">Best value</span>}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-[52px] leading-none tracking-[-1.5px]" data-testid="pro-price">
              ${price.perMonth}
            </span>
            <span className="text-[13px] text-on-dark-dim">/ month</span>
          </div>
          <p className="mt-2 text-[13px] text-on-dark-dim" data-testid="pro-billing">
            {interval === "YEAR" ? `$${price.amount} billed yearly` : "Billed monthly, cancel anytime"}
          </p>
          <Features items={PLAN_FEATURES.PRO} dark />
          <div className="mt-auto pt-6">
            {props.mode === "marketing" ? (
              <ButtonLink href="/register?next=/dashboard/billing" variant="light" className="w-full">
                Get Pro
              </ButtonLink>
            ) : (
              <UpgradeButton interval={interval} paddle={props.paddle} variant="light">
                Upgrade to Pro · ${price.amount}/{interval === "YEAR" ? "year" : "month"}
              </UpgradeButton>
            )}
            <p className="mt-2.5 text-center text-[11.5px] text-on-dark-dim-2">Secure checkout by Paddle · 14-day refund</p>
          </div>
        </section>
      </div>
    </div>
  );
}
