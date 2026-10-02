import { cn } from "@/lib/utils";

/** Segmented control: a 1px frame, the active item solid ink. */
export const segmentedFrame = "inline-flex shrink-0 rounded-full border border-line-2 p-0.5";

export function segmentedItem(active: boolean) {
  return cn(
    "inline-flex h-[30px] items-center rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap",
    active ? "bg-ink text-white" : "text-muted hover:text-ink",
  );
}

/** Text tab with an accent underline, as in the dashboard filters and settings tabs. */
export function tabItem(active: boolean) {
  return cn(
    "inline-flex items-center gap-1.5 pb-1.5 text-[13.5px] whitespace-nowrap shadow-[inset_0_-1.5px_0_transparent]",
    active ? "font-semibold text-accent shadow-[inset_0_-1.5px_0_var(--color-accent)]" : "text-muted hover:text-ink",
  );
}
