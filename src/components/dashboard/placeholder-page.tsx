import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Shell page for sections that are empty, gated, or not designed yet. */
export function PlaceholderPage({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex max-w-[640px] flex-col items-start gap-4 pt-2">
      <Icon className="size-6 opacity-60" strokeWidth={1.6} />
      <h1 className="font-serif text-[40px] leading-[1.02] tracking-[-1.2px] md:text-[52px] md:tracking-[-1.6px]">{title}</h1>
      <p className="max-w-[480px] text-base leading-[1.55] text-pretty text-ink-2">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
