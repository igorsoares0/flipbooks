import { cn } from "@/lib/utils";

/** Placeholder brand mark: a dark tile holding a paper page and a skewed accent page. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-ink", className)}>
      <span className="h-[13px] w-[9px] rounded-[1px_3px_3px_1px] bg-paper" />
      <span className="absolute top-[6.5px] left-[13px] h-[13px] w-2 -skew-y-[8deg] rounded-[3px_1px_1px_3px] bg-accent" />
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[15.5px] font-semibold tracking-[-0.3px]">Flipbook</span>
    </span>
  );
}
