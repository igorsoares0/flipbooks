import { cn } from "@/lib/utils";

export function Meter({
  value,
  className,
  barClassName,
  label,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  /** Makes it an accessible progress bar with this name. */
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={cn("h-[3px] overflow-hidden bg-line", className)}
      {...(label ? { role: "progressbar", "aria-label": label, "aria-valuenow": Math.round(pct), "aria-valuemin": 0, "aria-valuemax": 100 } : {})}
    >
      <div className={cn("h-full bg-accent", barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Usage meter: the value in Newsreader, "of X" muted, then a 3px bar. */
export function LabeledMeter({
  label,
  value,
  of,
  ratio,
  barClassName,
}: {
  label: string;
  value: string;
  of: string;
  ratio: number;
  barClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[12.5px] text-muted">{label}</div>
      <div className="mt-2 mb-3 flex flex-wrap items-baseline gap-x-2 tabular-nums">
        <span className="font-serif text-[36px] leading-none tracking-[-1px]">{value}</span>
        <span className="font-serif text-[18px] leading-none text-muted">{of}</span>
      </div>
      <Meter value={ratio} barClassName={barClassName} />
    </div>
  );
}
