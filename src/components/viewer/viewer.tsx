"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { PageCanvas } from "@/components/flipbook/page-canvas";
import type { FlipbookSettings, Page } from "@/lib/types";
import { cn, isDarkColor } from "@/lib/utils";
import { clampSpread, lastSpread, spreadLabel, spreadOf, spreadPages } from "./spreads";

function Folio({ n, side }: { n: number; side: "left" | "right" }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute font-mono text-[10px] font-medium text-muted-2",
        side === "left" ? "bottom-[14cqw] left-[12cqw]" : "right-3.5 bottom-3",
      )}
    >
      {String(n).padStart(2, "0")}
    </span>
  );
}

export function Viewer({
  flipbook,
  pages,
  initialPage,
  variant = "public",
  publicUrl,
}: {
  flipbook: { title: string; settings: FlipbookSettings };
  pages: Page[];
  initialPage: number;
  variant?: "public" | "embed";
  publicUrl: string;
}) {
  const { settings } = flipbook;
  const pageCount = pages.length;
  const maxSpread = lastSpread(pageCount);
  const [spread, setSpread] = useState(() => clampSpread(spreadOf(Math.max(1, initialPage)), pageCount));
  const [showThumbs, setShowThumbs] = useState(settings.showThumbnails);
  const [zoomed, setZoomed] = useState(false);
  const [copied, setCopied] = useState(false);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const numbers = spreadPages(spread, pageCount);
  const left = numbers.left ? pages[numbers.left - 1] : undefined;
  const right = numbers.right ? pages[numbers.right - 1] : undefined;
  const firstVisible = numbers.left ?? numbers.right ?? 1;
  const counter = spreadLabel(spread, pageCount);

  const go = useCallback((next: number) => setSpread(clampSpread(next, pageCount)), [pageCount]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft" || e.key === "PageUp") go(spread - 1);
      else if (e.key === "ArrowRight" || e.key === "PageDown") go(spread + 1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(maxSpread);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, spread, maxSpread]);

  // Deep link: keep ?page= in sync so a copied URL reopens the same spread.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(firstVisible));
    window.history.replaceState(null, "", url);
    thumbRefs.current[firstVisible - 1]?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [firstVisible]);

  const dark = isDarkColor(settings.backgroundColor);
  const fg = dark ? "text-on-dark" : "text-ink";
  const dim = dark ? "text-on-dark-dim-2" : "text-muted-2";
  const border = dark ? "border-line-dark" : "border-line-strong";
  const hoverBorder = dark ? "hover:border-on-dark" : "hover:border-ink";
  const chromeButton = cn("h-8 rounded-lg border bg-transparent px-3 text-xs font-semibold", fg, border, hoverBorder);
  const navButton = cn(
    "flex size-[42px] shrink-0 items-center justify-center rounded-full border disabled:opacity-30",
    border,
    fg,
    dark ? "bg-white/[.04] enabled:hover:bg-white/[.12]" : "bg-ink/[.03] enabled:hover:bg-ink/[.08]",
  );

  const sample = pages[0];
  const ratio = sample ? (sample.width * 2) / sample.height : 1.5;

  const share = async () => {
    await navigator.clipboard.writeText(`${publicUrl}?page=${firstVisible}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden" style={{ background: settings.backgroundColor }}>
      {variant === "public" && (
        <header className={cn("flex h-14 shrink-0 items-center gap-3.5 px-5", fg)}>
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-lg border", border, hoverBorder, fg)}
          >
            <ChevronLeft className="size-3.5" strokeWidth={1.8} />
          </Link>
          {settings.showLogo && (
            <span className="block size-[18px] shrink-0 rounded-[5px]" style={{ background: settings.accentColor }} />
          )}
          <div className="min-w-0">
            <h1 className="truncate text-[13.5px] font-semibold">{flipbook.title}</h1>
            <div className={cn("truncate font-mono text-[10.5px] font-medium", dim)}>{publicUrl.replace(/^https?:\/\//, "")}</div>
          </div>
          <div className="ml-auto flex items-center gap-2 max-sm:hidden">
            {settings.showThumbnails && (
              <button className={chromeButton} aria-pressed={showThumbs} onClick={() => setShowThumbs((v) => !v)}>
                Thumbnails
              </button>
            )}
            <button className={chromeButton} aria-pressed={zoomed} onClick={() => setZoomed((v) => !v)}>
              Zoom
            </button>
            {settings.showShare && (
              <button className={chromeButton} onClick={share}>
                {copied ? "Link copied" : "Share"}
              </button>
            )}
            {settings.showDownload && <button className={chromeButton}>Download</button>}
            {settings.showFullscreen && (
              <button className={chromeButton} onClick={fullscreen}>
                Fullscreen
              </button>
            )}
          </div>
        </header>
      )}

      <div className="flex min-h-0 flex-1 items-center justify-center gap-[22px] px-6 max-sm:gap-2 max-sm:px-2">
        <button className={navButton} aria-label="Previous pages" disabled={spread === 0} onClick={() => go(spread - 1)}>
          <ChevronLeft className="size-4" strokeWidth={1.6} />
        </button>

        <div className="flex h-full min-w-0 flex-1 items-center justify-center overflow-hidden">
          {/* Height-driven sizing is load-bearing: an auto-width aspect-ratio flex item collapses. */}
          <div
            className="flex max-w-full drop-shadow-[0_24px_70px_rgba(0,0,0,.55)]"
            style={
              {
                aspectRatio: ratio,
                height: `min(74vh, 100%, calc((100vw - 176px) / ${ratio}))`,
                transform: zoomed ? "scale(1.3)" : undefined,
              } as CSSProperties
            }
          >
            <div className="h-full w-1/2">
              {left && (
                <PageCanvas page={left} className="size-full rounded-l-[3px]" style={{ aspectRatio: "auto" }}>
                  <div className="pointer-events-none absolute inset-0 shadow-[inset_-14px_0_24px_-18px_rgba(0,0,0,.6)]" />
                  {left.pageNumber > 1 && <Folio n={left.pageNumber} side="left" />}
                </PageCanvas>
              )}
            </div>
            <div className="h-full w-1/2">
              {right && (
                <PageCanvas page={right} className="size-full rounded-r-[3px]" style={{ aspectRatio: "auto" }}>
                  <div className="pointer-events-none absolute inset-0 shadow-[inset_14px_0_24px_-18px_rgba(0,0,0,.45)]" />
                  {right.pageNumber > 1 && <Folio n={right.pageNumber} side="right" />}
                </PageCanvas>
              )}
            </div>
          </div>
        </div>

        <button className={navButton} aria-label="Next pages" disabled={spread === maxSpread} onClick={() => go(spread + 1)}>
          <ChevronRight className="size-4" strokeWidth={1.6} />
        </button>
      </div>

      <div className={cn("flex shrink-0 items-center justify-center gap-4 px-6", variant === "public" ? "h-24" : "h-16")}>
        {variant === "public" && showThumbs && (
          <div className="flex min-w-0 gap-1.5 overflow-x-auto p-1.5 max-sm:hidden" aria-label="Pages">
            {pages.map((page) => {
              const active = page === left || page === right;
              return (
                <button
                  key={page.id}
                  ref={(el) => {
                    thumbRefs.current[page.pageNumber - 1] = el;
                  }}
                  aria-label={`Go to page ${page.pageNumber}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => go(spreadOf(page.pageNumber))}
                  className={cn(
                    "h-[34px] w-[26px] shrink-0 rounded-[2px]",
                    active
                      ? dark ? "bg-on-dark" : "bg-ink"
                      : dark ? "bg-[rgba(246,244,239,.24)] hover:bg-[rgba(246,244,239,.4)]" : "bg-ink/15 hover:bg-ink/25",
                  )}
                />
              );
            })}
          </div>
        )}
        <div
          className={cn(
            "flex shrink-0 items-center gap-2.5 rounded-[22px] border px-3.5 py-[7px] whitespace-nowrap",
            border,
            fg,
            dark ? "bg-white/[.06]" : "bg-white/60",
          )}
        >
          <span className="font-mono text-xs font-medium" aria-live="polite">
            {counter} / {pageCount}
          </span>
          {settings.showBranding && (
            <>
              <span className={cn("h-3.5 w-px", dark ? "bg-line-dark" : "bg-line-strong")} />
              <Link href="/" target={variant === "embed" ? "_blank" : undefined} className={cn("text-[11.5px] hover:underline", dim)}>
                Powered by Flipbook
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
