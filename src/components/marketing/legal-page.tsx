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
      <main className={`max-w-[880px] py-[clamp(40px,6vw,72px)] ${gutter}`}>
        <h1 className="font-serif text-[clamp(40px,5vw,60px)] leading-none tracking-[-1.8px]">{title}</h1>
        <p className="mt-4 text-[13.5px] text-muted">Last updated {UPDATED}</p>
        <div className="mt-10 flex max-w-[680px] flex-col gap-4 border-t border-ink pt-8 text-[15px] leading-[1.7] text-ink-2 [&_a]:font-medium [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-[3px] [&_a:hover]:text-ink [&_h2]:mt-6 [&_h2]:font-serif [&_h2]:text-[24px] [&_h2]:leading-tight [&_h2]:tracking-[-0.5px] [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
