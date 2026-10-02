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
        "flex h-5 w-9 shrink-0 rounded-full p-0.5 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "justify-end bg-accent" : "justify-start bg-line-2",
      )}
      style={checked && color ? { background: color } : undefined}
    >
      <span className="block size-4 rounded-full bg-white" />
    </button>
  );
}
