import type { ReactNode } from "react";
import { gutter, SiteFooter, SiteHeader } from "./site-chrome";

// Layout for the legal pages. Their text is a DRAFT with placeholders in [BRACKETS]:
// fill in the company details and have a lawyer review it before launch.

export const COMPANY = "[COMPANY LEGAL NAME]";
export const ADDRESS = "[REGISTERED ADDRESS]";
export const CONTACT = "[CONTACT EMAIL]";
export const UPDATED = "September 19, 2026";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <SiteHeader />
      <main className={`mx-auto max-w-[760px] py-[clamp(40px,6vw,72px)] ${gutter}`}>
        <h1 className="font-serif text-[clamp(36px,5vw,52px)] leading-[1.05] tracking-[-1px]">{title}</h1>
        <p className="mt-3 text-[13px] text-muted-2">Last updated {UPDATED}</p>
        <div className="mt-8 flex flex-col gap-4 text-[14.5px] leading-[1.7] text-ink-70 [&_a]:font-medium [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-6 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
