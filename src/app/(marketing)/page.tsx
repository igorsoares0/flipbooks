import { Check } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { resolveEntitlements } from "@/lib/entitlements";
import { formatCount, formatGb } from "@/lib/format";

const lifetime = resolveEntitlements("LIFETIME");

const FEATURES = [
  { n: "01", title: "PDF in, flipbook out", body: "Pages, thumbnails and a public URL rendered automatically — usually under a minute." },
  { n: "02", title: "Design from scratch", body: "A canvas editor with text, images and shapes. Autosave, undo/redo, templates." },
  { n: "03", title: "Publish and embed", body: "A clean public link plus an iframe snippet that fits any site or LMS." },
  { n: "04", title: "Know what they read", body: "Views, reading time, per-page drop-off, devices and countries." },
];

const LTD_INCLUDES = [
  "Unlimited flipbooks",
  `${formatGb(lifetime.maxStorageBytes)} GB storage`,
  `${formatCount(lifetime.maxPagesProcessed)} pages processed`,
  "Canvas editor + templates",
  "Remove Flipbook branding",
  "Analytics and embeds",
  "All future MVP updates",
];

const gutter = "px-[clamp(18px,4vw,56px)]";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-paper">
      <header
        className={`sticky top-0 z-10 flex h-[66px] items-center gap-4 border-b border-line bg-[rgba(243,241,236,.9)] backdrop-blur-[8px] ${gutter}`}
      >
        <Link href="/" className="text-ink hover:text-ink">
          <Logo />
        </Link>
        <nav className="ml-[26px] flex gap-5 text-[13px] text-ink-70 max-md:hidden">
          <a href="#features" className="hover:text-ink">
            Features
          </a>
          <a href="#pricing" className="hover:text-ink">
            Pricing
          </a>
          <Link href="/dashboard/templates" className="hover:text-ink">
            Templates
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          <Link href="/login" className="text-[13px] font-semibold whitespace-nowrap text-ink max-sm:hidden">
            Log in
          </Link>
          <ButtonLink href="/register">Get the Lifetime Deal</ButtonLink>
        </div>
      </header>

      <section className={`mx-auto flex max-w-[1180px] flex-wrap items-center gap-11 pt-[clamp(48px,8vw,96px)] ${gutter}`}>
        <div className="min-w-0 flex-[1_1_380px]">
          <span className="inline-flex max-w-full items-center gap-[7px] overflow-hidden rounded-[20px] border border-line bg-surface px-3 py-1.5 font-mono text-[10.5px] leading-[1.4] font-medium whitespace-nowrap text-muted">
            ● LIFETIME DEAL · FIRST 500 SEATS
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
            One payment · no subscription · {formatGb(lifetime.maxStorageBytes)} GB storage
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
        <div className="flex flex-wrap items-center gap-9 rounded-[20px] bg-ink p-[clamp(28px,4vw,48px)] text-on-dark">
          <div className="min-w-0 flex-[1_1_300px]">
            <div className="label-mono tracking-[.1em] text-on-dark-dim-2">LAUNCH PRICING</div>
            <div className="mt-3.5 flex items-baseline gap-3">
              <span className="font-serif text-[clamp(48px,7vw,76px)] leading-none tracking-[-2px]">$79</span>
              <span className="text-base text-on-dark-dim-2 line-through">$348/yr</span>
            </div>
            <div className="mt-2.5 text-sm text-on-dark-dim">Pay once. Keep it forever.</div>
            <ButtonLink href="/register" variant="light" size="lg" className="mt-[22px]">
              Buy the Lifetime Deal
            </ButtonLink>
            <div className="mt-2.5 text-[11.5px] text-on-dark-dim-2">Secure checkout via Paddle · 30-day refund</div>
          </div>
          <ul className="flex min-w-0 flex-[1_1_260px] flex-col gap-[11px]">
            {LTD_INCLUDES.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] leading-normal text-line">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#243B8E] text-white">
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className={`mx-auto flex max-w-[1180px] flex-wrap items-center gap-3.5 border-t border-line py-[26px] ${gutter}`}>
        <span className="text-xs text-muted-2">© 2026 Flipbook</span>
        <div className="ml-auto flex flex-wrap gap-[18px] text-xs text-muted">
          <a href="#features" className="hover:text-ink">
            Features
          </a>
          <a href="#pricing" className="hover:text-ink">
            Pricing
          </a>
          <Link href="/dashboard/templates" className="hover:text-ink">
            Templates
          </Link>
          {/* Legal pages are not written yet. */}
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </footer>
    </div>
  );
}
