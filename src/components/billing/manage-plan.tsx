"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { openCustomerPortal, switchInterval } from "@/lib/actions/billing";
import { PRO_PRICES } from "@/lib/billing/catalog";
import type { BillingInterval } from "@/lib/types";

/** Buttons for a Paddle-managed subscription: the hosted portal and a monthly ⇄ yearly switch. */
export function ManagePlan({ interval, canSwitch }: { interval: BillingInterval | null; canSwitch: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const target: BillingInterval = interval === "YEAR" ? "MONTH" : "YEAR";

  const switchTo = () =>
    startTransition(async () => {
      setError(null);
      const result = await switchInterval(target);
      if (result.ok) router.refresh();
      else setError(result.error);
    });

  return (
    <div className="flex flex-col gap-2">
      <form action={openCustomerPortal}>
        <Button type="submit" variant="light" className="w-full px-[18px] py-2.5 text-[13px]">
          Manage subscription
        </Button>
      </form>
      {canSwitch && interval && (
        <Button variant="dark-outline" className="px-[18px] py-2.5 text-[13px]" onClick={switchTo} disabled={pending}>
          {pending ? "Switching…" : target === "YEAR" ? `Switch to yearly · $${PRO_PRICES.YEAR.amount}/year` : "Switch to monthly"}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-[12px] text-[#F5A9A1]">
          {error}
        </p>
      )}
    </div>
  );
}

/** After checkout, the plan changes when Paddle's webhook lands; poll until it does. */
export function ActivatingPro({ active }: { active: boolean }) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started > 60_000) {
        setTimedOut(true);
        clearInterval(timer);
      } else router.refresh();
    }, 2_000);
    return () => clearInterval(timer);
  }, [active, router]);

  if (!active) return null;
  return (
    <p role="status" className="rounded-xl border border-accent/25 bg-accent-soft px-4 py-3 text-[13px] text-accent">
      {timedOut ? (
        <>
          <span className="font-semibold">Payment received.</span> Your plan is taking longer than usual to update. Refresh in a
          minute, or contact us if it doesn&apos;t change.
        </>
      ) : (
        <>
          <span className="font-semibold">Thanks! Activating Pro…</span> This takes a few seconds.
        </>
      )}
    </p>
  );
}
