import { cn } from "@/lib/utils";

export function Meter({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={cn("h-[5px] overflow-hidden rounded-[3px] bg-track", className)}>
      <div className={cn("h-full rounded-[3px] bg-accent", barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Label + mono value on a wrapping row above a meter; the row wraps so long labels never hit the value. */
export function LabeledMeter({
  label,
  value,
  ratio,
  barClassName,
}: {
  label: string;
  value: string;
  ratio: number;
  barClassName?: string;
}) {
  return (
    <div>
      <div className="mb-[7px] flex flex-wrap justify-between gap-x-2.5 gap-y-0.5 text-[12.5px] leading-[1.35]">
        <span className="min-w-0 font-medium">{label}</span>
        <span className="shrink-0 font-mono text-[11.5px] font-medium whitespace-nowrap text-muted">{value}</span>
      </div>
      <Meter value={ratio} barClassName={barClassName} />
    </div>
  );
}
