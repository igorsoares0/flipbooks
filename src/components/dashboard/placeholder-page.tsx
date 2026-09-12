import type { LucideIcon } from "lucide-react";

/** Shell page for sections that are in the spec but not designed yet. */
export function PlaceholderPage({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="rounded-2xl border border-line bg-surface px-6 py-[52px] text-center">
        <div className="mx-auto mb-4 flex size-[46px] items-center justify-center rounded-xl bg-surface-alt">
          <Icon className="size-5" strokeWidth={1.6} />
        </div>
        <h1 className="text-sm font-semibold">{title}</h1>
        <p className="mx-auto mt-[7px] max-w-[340px] text-[12.5px] leading-[1.55] text-pretty text-muted">{body}</p>
      </div>
    </div>
  );
}
