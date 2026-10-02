import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Label above, hint top-right, control below. Pair it with an `input-line` input
 * (globals.css): an underline that darkens once the field is focused or filled.
 */
export function Field({
  label,
  htmlFor,
  hint,
  hintTone = "muted",
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  hintTone?: "muted" | "success" | "danger";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold">
          {label}
        </label>
        {hint && (
          <span
            className={cn(
              "text-[12.5px]",
              hintTone === "success" ? "text-success" : hintTone === "danger" ? "text-danger" : "text-muted",
            )}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
