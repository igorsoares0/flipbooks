import type { FlipbookStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS: Record<FlipbookStatus, { label: string; className: string }> = {
  UPLOADING: { label: "Uploading", className: "bg-warning-soft text-warning-ink" },
  PUBLISHED: { label: "Published", className: "bg-success-soft text-success" },
  DRAFT: { label: "Draft", className: "bg-surface-alt text-muted" },
  PROCESSING: { label: "Processing", className: "bg-warning-soft text-warning-ink" },
  READY: { label: "Ready", className: "bg-accent-soft text-accent" },
  FAILED: { label: "Failed", className: "bg-danger-soft text-danger" },
  ARCHIVED: { label: "Archived", className: "bg-surface-alt text-muted-2" },
};

export function StatusBadge({ status }: { status: FlipbookStatus }) {
  const { label, className } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[20px] px-[9px] py-[3px] text-[11px] font-semibold whitespace-nowrap",
        className,
      )}
    >
      <span className="size-[5px] rounded-full bg-current" />
      {label}
    </span>
  );
}

/** Mono outlined tag: PDF, CANVAS, TEXT, IMAGE… */
export function TypeBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded border border-line px-[5px] py-[1.5px] font-mono text-[9.5px] font-medium text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
