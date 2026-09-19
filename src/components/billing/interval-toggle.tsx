"use client";

import { YEARLY_SAVING } from "@/lib/billing/catalog";
import type { BillingInterval } from "@/lib/types";
import { cn } from "@/lib/utils";

export function IntervalToggle({
  value,
  onChange,
  dark = false,
}: {
  value: BillingInterval;
  onChange: (value: BillingInterval) => void;
  dark?: boolean;
}) {
  const options: { value: BillingInterval; label: string }[] = [
    { value: "MONTH", label: "Monthly" },
    { value: "YEAR", label: "Yearly" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Billing period"
      className={cn("inline-flex items-center gap-1 rounded-full border p-1", dark ? "border-line-dark" : "border-line bg-surface")}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold",
              active ? (dark ? "bg-on-dark text-ink" : "bg-ink text-white") : dark ? "text-on-dark-dim hover:text-on-dark" : "text-muted hover:text-ink",
            )}
          >
            {option.label}
            {option.value === "YEAR" && (
              <span className={cn("rounded-full px-1.5 py-px text-[10px]", active ? "bg-success text-white" : "bg-success-soft text-success")}>
                −{YEARLY_SAVING}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
