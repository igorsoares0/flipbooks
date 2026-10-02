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
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2.5">
        {canSwitch && interval && (
          <Button variant="outline" onClick={switchTo} disabled={pending}>
            {pending ? "Switching…" : target === "YEAR" ? `Switch to yearly · $${PRO_PRICES.YEAR.amount}/year` : "Switch to monthly"}
          </Button>
        )}
        <form action={openCustomerPortal}>
          <Button type="submit" variant="primary" className="px-5">
            Manage subscription
          </Button>
        </form>
      </div>
      {error && (
        <p role="alert" className="text-[12.5px] text-danger">
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
    <p role="status" className="bg-accent-tint px-4 py-3 text-[13.5px] text-accent">
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
