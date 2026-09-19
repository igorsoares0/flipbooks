import { PlanPicker } from "@/components/billing/plan-picker";
import { gutter, SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { ButtonLink } from "@/components/ui/button";
import { PRO_PRICES } from "@/lib/billing/catalog";
import { resolveEntitlements } from "@/lib/entitlements";

const free = resolveEntitlements("FREE");

const FEATURES = [
  { n: "01", title: "PDF in, flipbook out", body: "Pages, thumbnails and a public URL rendered automatically — usually under a minute." },
  { n: "02", title: "Design from scratch", body: "A canvas editor with text, images and shapes. Autosave, undo/redo, templates." },
  { n: "03", title: "Publish and embed", body: "A clean public link plus an iframe snippet that fits any site or LMS." },
  { n: "04", title: "Know what they read", body: "Views, reading time, per-page drop-off, devices and countries." },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-paper">
      <SiteHeader />

      <section className={`mx-auto flex max-w-[1180px] flex-wrap items-center gap-11 pt-[clamp(48px,8vw,96px)] ${gutter}`}>
        <div className="min-w-0 flex-[1_1_380px]">
          <span className="inline-flex max-w-full items-center gap-[7px] overflow-hidden rounded-[20px] border border-line bg-surface px-3 py-1.5 font-mono text-[10.5px] leading-[1.4] font-medium whitespace-nowrap text-muted">
            ● FREE PLAN · NO CARD NEEDED
          </span>
          <h1 className="mt-5 font-serif text-[clamp(42px,6.4vw,72px)] leading-[1.02] tracking-[-2px]">
            Create stunning
            <br />
            flipbooks.
          </h1>
          <p className="mt-[18px] mb-7 max-w-[460px] text-[clamp(15px,1.6vw,18px)] leading-[1.6] text-pretty text-ink-70">
            Upload a PDF or design from scratch. Publish a link, embed it anywhere, and measure every page.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <ButtonLink href="/register" size="lg">
              Create your first flipbook
            </ButtonLink>
            <ButtonLink href="/f/summer-catalog?page=4" variant="outline" size="lg">
              See a live example
            </ButtonLink>
          </div>
          <div className="mt-4 text-xs text-muted-2">
            Free for {free.maxFlipbooks} flipbooks · Pro from ${PRO_PRICES.YEAR.perMonth}/month
          </div>
        </div>
        <div className="min-w-0 flex-[1_1_380px]" aria-hidden>
          <div className="flex gap-4 rounded-[18px] bg-ink p-[26px] shadow-hero">
            <div className="aspect-[3/4] flex-1 rounded-[2px] bg-on-dark p-[18px] shadow-page">
              <div className="font-mono text-[9px] font-medium tracking-[.1em] text-muted-2">CHAPTER TWO</div>
              <div className="mt-2.5 font-serif text-2xl leading-[1.08]">Light, linen and long evenings</div>
              <div className="mt-3.5 h-1 rounded-[3px] bg-[rgba(23,21,15,.13)]" />
              <div className="mt-1.5 h-1 w-[82%] rounded-[3px] bg-[rgba(23,21,15,.13)]" />
              <div className="mt-1.5 h-1 w-[66%] rounded-[3px] bg-[rgba(23,21,15,.13)]" />
            </div>
            <div className="placeholder-gradient flex aspect-[3/4] flex-1 items-end rounded-[2px] p-3.5 shadow-page">
              <span className="font-mono text-[9px] font-medium text-[rgba(23,21,15,.45)]">IMAGE PLACEHOLDER</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className={`mx-auto max-w-[1180px] scroll-mt-20 py-[clamp(48px,7vw,88px)] ${gutter}`}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
          {FEATURES.map((f) => (
            <div key={f.n} className="rounded-2xl border border-line bg-surface p-[22px]">
              <div className="label-mono text-muted-3">{f.n}</div>
              <h2 className="mt-3 text-[15px] font-semibold">{f.title}</h2>
              <p className="mt-2 text-[12.5px] leading-[1.6] text-pretty text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className={`mx-auto max-w-[1180px] scroll-mt-20 pb-[clamp(56px,8vw,100px)] ${gutter}`}>
        <div className="mb-8 text-center">
          <h2 className="font-serif text-[clamp(32px,4.4vw,46px)] leading-[1.08] tracking-[-1px]">Simple pricing</h2>
          <p className="mt-2.5 text-[14px] text-muted">Start free. Upgrade when you need more flipbooks, analytics or your own brand.</p>
        </div>
        <PlanPicker mode="marketing" />
      </section>

      <SiteFooter />
    </div>
  );
}
