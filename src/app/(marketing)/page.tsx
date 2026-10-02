import { PlanPicker } from "@/components/billing/plan-picker";
import { gutter, SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { PRO_PRICES } from "@/lib/billing/catalog";
import { resolveEntitlements } from "@/lib/entitlements";

const free = resolveEntitlements("FREE");

const FEATURES = [
  { n: "01", title: "PDF in, flipbook out", body: "Pages, thumbnails and a public URL rendered automatically, usually in under a minute." },
  { n: "02", title: "Design from scratch", body: "A canvas editor with text, images and shapes. Autosave, undo and redo, templates." },
  { n: "03", title: "Publish and embed", body: "A clean public link plus an iframe snippet that fits any site or LMS." },
  { n: "04", title: "Know what they read", body: "Views, reading time, per-page drop-off, devices and countries." },
];

// Sample views per page for the analytics illustration; page 10 is the drop-off.
const SAMPLE_VIEWS = [100, 90, 83, 79, 75, 71, 68, 66, 63, 41, 39, 38, 37, 35];
const SAMPLE_DROP = 9;

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-paper">
      <SiteHeader />

      <section className={`grid items-center gap-16 border-b border-ink pt-[clamp(48px,7vw,80px)] pb-[clamp(48px,6vw,72px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] ${gutter}`}>
        <div className="flex min-w-0 flex-col items-start gap-[26px]">
          <span className="text-sm font-semibold text-accent">Free plan · no card needed</span>
          <h1 className="font-serif text-[clamp(52px,7.4vw,96px)] leading-[.94] tracking-[-0.035em]">
            Create <em className="text-accent">stunning</em> flipbooks.
          </h1>
          <p className="max-w-[520px] text-[clamp(16px,1.6vw,19px)] leading-[1.55] text-pretty text-ink-2">
            Upload a PDF or design from scratch. Publish a link, embed it anywhere, and measure every page.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/register" variant="primary" className="h-[52px] px-[26px] text-[15.5px]">
              Create your first flipbook
            </ButtonLink>
            <ButtonLink href="/f/summer-catalog?page=4" variant="outline" className="h-[52px] px-6 text-[15.5px]">
              See a live example
            </ButtonLink>
          </div>
          <span className="text-[13.5px] text-muted">
            Free for {free.maxFlipbooks} flipbooks · Pro from ${PRO_PRICES.YEAR.perMonth} a month
          </span>
        </div>
        <div className="flex min-w-0 justify-center bg-reader px-[clamp(16px,3vw,40px)] py-12" aria-hidden>
          <div className="flex w-full max-w-[500px] shadow-[0_30px_70px_rgba(0,0,0,.5)]">
            <div className="flex aspect-[3/4] flex-1 flex-col gap-3 bg-[#F4F0E8] p-[clamp(12px,2vw,24px)]">
              <div className="font-serif text-[11px] text-[#6E5F45]">Chapter two</div>
              <div className="h-[57%] bg-[#CFC6B4]" />
              <div className="font-serif text-[10.5px] leading-normal text-[#3C3426]">The table is set by eight, the doors stay open.</div>
            </div>
            <div className="relative aspect-[3/4] flex-1 bg-[#FAF8F3] p-[clamp(12px,2vw,24px)]">
              <div className="font-serif text-[clamp(18px,2.2vw,30px)] leading-[1.02] tracking-[-0.7px] text-[#17150F]">Light, linen and long evenings</div>
              <div className="absolute right-[10%] bottom-[9%] aspect-square w-[24%] rounded-full bg-[#1B45D6]" />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className={`grid scroll-mt-20 gap-10 border-b border-ink py-[clamp(48px,6vw,72px)] sm:grid-cols-2 lg:grid-cols-4 ${gutter}`}>
        {FEATURES.map((f) => (
          <div key={f.n} className="flex flex-col gap-3 border-t border-ink pt-4">
            <span className="text-[13px] text-faint">{f.n}</span>
            <h2 className="font-serif text-[30px] leading-[1.05] tracking-[-0.7px]">{f.title}</h2>
            <p className="text-[15px] leading-[1.55] text-pretty text-ink-2">{f.body}</p>
          </div>
        ))}
      </section>

      <section className={`grid items-center gap-[clamp(32px,5vw,72px)] border-b border-ink py-[clamp(56px,7vw,80px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] ${gutter}`}>
        <div className="flex flex-col gap-[18px]">
          <span className="text-sm font-semibold text-accent">Analytics</span>
          <h2 className="font-serif text-[clamp(40px,4.6vw,60px)] leading-none tracking-[-1.8px]">See the page where readers leave.</h2>
          <p className="text-[17px] leading-[1.55] text-ink-2">Views per page, reading time, devices and countries for every flipbook you publish.</p>
        </div>
        <div className="flex flex-col gap-2.5" aria-hidden>
          <div className="flex h-60 items-end gap-2.5 border-b border-ink max-sm:gap-1.5">
            {SAMPLE_VIEWS.map((v, i) => (
              <div key={i} className={i === SAMPLE_DROP ? "flex-1 bg-accent" : "flex-1 bg-ink"} style={{ height: `${v}%` }} />
            ))}
          </div>
          <div className="flex justify-between text-[12.5px] text-muted">
            <span>Page 1</span>
            <span className="font-semibold text-accent">−35% after page {SAMPLE_DROP}</span>
            <span>Page {SAMPLE_VIEWS.length}</span>
          </div>
        </div>
      </section>

      <section id="pricing" className={`scroll-mt-20 pt-[clamp(56px,7vw,80px)] pb-[clamp(56px,7vw,80px)] ${gutter}`}>
        <PlanPicker
          mode="marketing"
          header={
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <h2 className="font-serif text-[clamp(40px,4.6vw,60px)] leading-none tracking-[-1.8px]">Simple pricing</h2>
              <p className="pb-2 text-base text-ink-2">Start free. Upgrade when you need more flipbooks, analytics or your own brand.</p>
            </div>
          }
        />
      </section>

      <SiteFooter />
    </div>
  );
}
