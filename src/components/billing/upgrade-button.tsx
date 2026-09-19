"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { useState } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { startCheckout } from "@/lib/actions/billing";
import type { BillingInterval } from "@/lib/types";
import { cn } from "@/lib/utils";

export type PaddleClientConfig = { token: string; environment: "sandbox" | "production" };

let paddlePromise: Promise<Paddle | undefined> | null = null;

function loadPaddle(config: PaddleClientConfig) {
  paddlePromise ??= initializePaddle({ token: config.token, environment: config.environment });
  return paddlePromise;
}

/** Opens Paddle's checkout overlay for Pro. The transaction is created on the server. */
export function UpgradeButton({
  interval,
  paddle,
  variant = "primary",
  className,
  children,
}: {
  interval: BillingInterval;
  /** Null when billing isn't configured on this server. */
  paddle: PaddleClientConfig | null;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    setError(null);
    if (!paddle) return setError("Billing isn't set up on this server yet.");
    setBusy(true);
    try {
      const [checkout, instance] = await Promise.all([startCheckout(interval), loadPaddle(paddle)]);
      if (!checkout.ok) return setError(checkout.error);
      if (!instance) return setError("The payment window couldn't load. Check your connection and try again.");
      instance.Checkout.open({
        transactionId: checkout.transactionId,
        customer: { email: checkout.email },
        settings: {
          displayMode: "overlay",
          theme: "light",
          successUrl: new URL("/dashboard/billing?checkout=success", window.location.origin).toString(),
        },
      });
    } catch {
      setError("Something went wrong starting the checkout. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button variant={variant} className={cn("w-full", className)} onClick={open} disabled={busy}>
        {busy ? "Opening checkout…" : children}
      </Button>
      {error && (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
