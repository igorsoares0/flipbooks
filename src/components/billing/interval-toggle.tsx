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
      className={cn("inline-flex items-center gap-0.5 rounded-full border p-0.5", dark ? "border-line-dark" : "border-line-2")}
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
              "flex h-[30px] items-center gap-2 rounded-full px-3.5 text-[13px]",
              active ? (dark ? "bg-on-dark font-semibold text-ink" : "bg-ink font-semibold text-white") : dark ? "text-on-dark-dim hover:text-on-dark" : "text-ink hover:bg-hover",
            )}
          >
            {option.label}
            {option.value === "YEAR" && <span className={cn("font-medium", active ? "opacity-75" : "text-success")}>save {YEARLY_SAVING}%</span>}
          </button>
        );
      })}
    </div>
  );
}
