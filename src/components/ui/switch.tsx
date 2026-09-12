"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
  color,
  disabled,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Track color when on; defaults to the accent token. */
  color?: string;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex h-[22px] w-[38px] shrink-0 rounded-[20px] p-0.5 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "justify-end bg-accent" : "justify-start bg-switch-off",
      )}
      style={checked && color ? { background: color } : undefined}
    >
      <span className="block size-[18px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)]" />
    </button>
  );
}
