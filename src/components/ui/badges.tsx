import type { FlipbookStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS: Record<FlipbookStatus, { label: string; dot: string }> = {
  UPLOADING: { label: "Uploading", dot: "bg-warning" },
  PUBLISHED: { label: "Live", dot: "bg-success" },
  DRAFT: { label: "Draft", dot: "bg-placeholder" },
  PROCESSING: { label: "Rendering", dot: "bg-warning" },
  READY: { label: "Ready", dot: "bg-accent" },
  FAILED: { label: "Failed", dot: "bg-danger" },
  ARCHIVED: { label: "Archived", dot: "bg-line-2" },
};

/** Status is a 7px dot and a label, never a filled badge. */
export function StatusBadge({ status }: { status: FlipbookStatus }) {
  const { label, dot } = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-2 text-[13px] whitespace-nowrap", status === "FAILED" ? "text-danger" : "text-ink")}>
      <span className={cn("size-[7px] shrink-0 rounded-full", dot)} />
      {label}
    </span>
  );
}

/** Type tag: PDF, Canvas, Text, Image… */
export function TypeBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("shrink-0 rounded-[10px] bg-canvas px-[9px] py-[3px] text-[11.5px] leading-[1.3] font-semibold text-ink-2", className)}>
      {children}
    </span>
  );
}
