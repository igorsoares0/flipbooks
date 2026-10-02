import { cn } from "@/lib/utils";

/** The wordmark is just Newsreader italic text. */
export function Logo({ className }: { className?: string }) {
  return <span className={cn("font-serif text-[30px] leading-none tracking-[-0.8px] italic", className)}>Flipbook</span>;
}
