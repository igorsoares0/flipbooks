"use client";

import { ChevronLeft, ChevronRight, Download, GalleryHorizontal, Maximize, ZoomIn } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FlipbookSettings, Page } from "@/lib/types";
import { cn, isDarkColor } from "@/lib/utils";
import { PageTurn } from "./page-turn";
import { useReaderAnalytics } from "./reader-analytics";
import { clampView, lastView, viewLabel, viewOfPage, viewPages, type ViewMode } from "./spreads";
import { useMediaQuery } from "./use-media-query";

/** One page at a time on a phone; two on anything wider, like a printed book. */
const SINGLE_PAGE_QUERY = "(max-width: 700px)";

function Folio({ n, side }: { n: number; side: "left" | "right" }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute text-[10px] text-muted tabular-nums",
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
  downloadHref = null,
  trackingId = null,
}: {
  flipbook: { title: string; settings: FlipbookSettings };
  pages: Page[];
  initialPage: number;
  variant?: "public" | "embed";
  publicUrl: string;
  /** Original-PDF download, when the owner allows it. */
  downloadHref?: string | null;
  /** Flipbook id to record reader analytics for; null for books that aren't public. */
  trackingId?: string | null;
}) {
  const { settings } = flipbook;
  const pageCount = pages.length;
  const single = useMediaQuery(SINGLE_PAGE_QUERY);
  const mode: ViewMode = single ? "single" : "spread";
  const maxView = lastView(pageCount, mode);
  // Positions are kept as page numbers, so switching between one and two pages (rotating a
  // phone, resizing) keeps the reader where they were. `target` is where they're heading;
  // `landed` is the page the book has actually turned to.
  const [target, setTarget] = useState(() => Math.max(1, Math.min(initialPage, pageCount)));
  const [landed, setLanded] = useState(target);
  const view = clampView(viewOfPage(target, mode), pageCount, mode);
  const shown = clampView(viewOfPage(landed, mode), pageCount, mode);
  const [showThumbs, setShowThumbs] = useState(settings.showThumbnails);
  const [zoomed, setZoomed] = useState(false);
  const [copied, setCopied] = useState(false);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const numbers = viewPages(shown, pageCount, mode);
  const firstVisible = numbers.left ?? numbers.right ?? 1;
  const counter = viewLabel(shown, pageCount, mode);
  // Reading time is counted for the pages on screen, so it starts once the turn lands.
  const { track } = useReaderAnalytics(trackingId, [numbers.left, numbers.right].filter((n): n is number => Boolean(n)));

  /** Navigates to a view; positions are stored as the first page it shows. */
  const go = useCallback(
    (next: number) => {
      const pages = viewPages(clampView(next, pageCount, mode), pageCount, mode);
      setTarget(pages.left ?? pages.right ?? 1);
    },
    [pageCount, mode],
  );

  /**
   * The book finished turning. Only a page the reader dragged over moves where they were
   * heading; a click's landing must not cancel a second click made while it animated.
   */
  const onSettled = useCallback(
    (settled: number, moved: boolean) => {
      const pages = viewPages(settled, pageCount, mode);
      const page = pages.left ?? pages.right ?? 1;
      setLanded(page);
      if (moved) setTarget(page);
    },
    [pageCount, mode],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft" || e.key === "PageUp") go(view - 1);
      else if (e.key === "ArrowRight" || e.key === "PageDown") go(view + 1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(maxView);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, view, maxView]);

  // Deep link: keep ?page= in sync so a copied URL reopens the same spread.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(firstVisible));
    window.history.replaceState(null, "", url);
    thumbRefs.current[viewOfPage(firstVisible, mode)]?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [firstVisible, mode]);

  // Warm the cache with the neighbouring pages so a turn never shows a blank sheet.
  useEffect(() => {
    for (const step of [1, -1]) {
      const near = viewPages(clampView(shown + step, pageCount, mode), pageCount, mode);
      for (const n of [near.left, near.right]) {
        const url = n ? pages[n - 1]?.backgroundImageUrl : null;
        if (url) new Image().src = url;
      }
    }
  }, [shown, pageCount, pages, mode]);

  const dark = isDarkColor(settings.backgroundColor);
  const fg = dark ? "text-on-dark" : "text-ink";
  const dim = dark ? "text-faint" : "text-muted";
  const border = dark ? "border-line-dark" : "border-line-2";
  const hoverBorder = dark ? "hover:border-on-dark-dim" : "hover:border-ink";
  // Ghost pills; Share is the one solid control.
  const chromeButton = cn(
    "inline-flex h-[34px] items-center gap-2 rounded-full px-3.5 text-[13px] aria-pressed:font-semibold",
    fg,
    dark ? "hover:bg-white/[.08] aria-pressed:bg-white/[.12]" : "hover:bg-ink/[.05] aria-pressed:bg-ink/[.08]",
  );
  const solidButton = cn(
    "ml-1.5 inline-flex h-[34px] items-center rounded-full px-4 text-[13px] font-semibold",
    dark ? "bg-on-dark text-ink hover:bg-white" : "bg-ink text-white hover:bg-ink-2",
  );
  const navButton = cn(
    "flex size-[46px] shrink-0 items-center justify-center rounded-full border disabled:opacity-30",
    border,
    fg,
    dark ? "enabled:hover:bg-white/[.08]" : "enabled:hover:bg-ink/[.05]",
  );
  const icon = "size-4 opacity-80";

  const share = async () => {
    await navigator.clipboard.writeText(`${publicUrl}?page=${firstVisible}`);
    track("SHARE");
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
        <header className={cn("flex h-[60px] shrink-0 items-center gap-3.5 px-6 max-sm:px-3", fg)}>
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className={cn("flex size-[34px] shrink-0 items-center justify-center rounded-full border", border, hoverBorder, fg)}
          >
            <ChevronLeft className="size-4" strokeWidth={1.6} />
          </Link>
          {settings.showLogo && <span className="block size-5 shrink-0 rounded-[5px]" style={{ background: settings.accentColor }} />}
          <div className="min-w-0">
            <h1 className="truncate font-serif text-[18px] leading-tight tracking-[-0.3px]">{flipbook.title}</h1>
            <div className={cn("truncate text-[11.5px]", dim)}>{publicUrl.replace(/^https?:\/\//, "")}</div>
          </div>
          <div className="ml-auto flex items-center gap-1 max-sm:hidden">
            {settings.showThumbnails && (
              <button className={chromeButton} aria-pressed={showThumbs} onClick={() => setShowThumbs((v) => !v)}>
                <GalleryHorizontal className={icon} strokeWidth={1.6} />
                Thumbnails
              </button>
            )}
            <button className={chromeButton} aria-pressed={zoomed} onClick={() => setZoomed((v) => !v)}>
              <ZoomIn className={icon} strokeWidth={1.6} />
              Zoom
            </button>
            {downloadHref && (
              <a href={downloadHref} className={chromeButton} aria-label="Download PDF" download onClick={() => track("DOWNLOAD")}>
                <Download className={icon} strokeWidth={1.6} />
                PDF
              </a>
            )}
            {settings.showFullscreen && (
              <button className={chromeButton} onClick={fullscreen}>
                <Maximize className={icon} strokeWidth={1.6} />
                Fullscreen
              </button>
            )}
            {settings.showShare && (
              <button className={solidButton} onClick={share}>
                {copied ? "Link copied" : "Share"}
              </button>
            )}
          </div>
        </header>
      )}

      {/* On a phone the arrows sit over the page, so one page can use the whole width. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center gap-7 px-6 max-sm:gap-2 max-sm:px-2">
        <button
          className={cn(navButton, single && cn("absolute top-1/2 left-2 z-10 -translate-y-1/2 backdrop-blur-sm", dark ? "bg-black/45" : "bg-white/75"))}
          aria-label="Previous pages"
          disabled={view === 0}
          onClick={() => go(view - 1)}
        >
          <ChevronLeft className="size-[18px]" strokeWidth={1.6} />
        </button>

        <PageTurn
          pages={pages}
          view={view}
          settled={shown}
          mode={mode}
          onSettled={onSettled}
          zoomed={zoomed}
          folio={(page, side) => (page.pageNumber > 1 ? <Folio n={page.pageNumber} side={side} /> : null)}
        />

        <button
          className={cn(navButton, single && cn("absolute top-1/2 right-2 z-10 -translate-y-1/2 backdrop-blur-sm", dark ? "bg-black/45" : "bg-white/75"))}
          aria-label="Next pages"
          disabled={view === maxView}
          onClick={() => go(view + 1)}
        >
          <ChevronRight className="size-[18px]" strokeWidth={1.6} />
        </button>
      </div>

      <div className={cn("flex shrink-0 items-center justify-center gap-6 px-6", fg, variant === "public" ? "h-[84px]" : "h-16")}>
        {/* Progress strip: one tick per view, the current one taller and light. */}
        {variant === "public" && showThumbs && (
          <div className="flex min-w-0 items-center gap-[3px] overflow-x-auto py-2 max-sm:hidden" aria-label="Pages">
            {Array.from({ length: maxView + 1 }, (_, v) => {
              const active = v === shown;
              const { left, right } = viewPages(v, pageCount, mode);
              const first = left ?? right ?? 1;
              return (
                <button
                  key={v}
                  ref={(el) => {
                    thumbRefs.current[v] = el;
                  }}
                  aria-label={`Go to page ${first}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => go(v)}
                  className={cn(
                    "w-1.5 shrink-0 rounded-[1px]",
                    active ? "h-[22px]" : "h-3.5",
                    active
                      ? dark ? "bg-on-dark" : "bg-ink"
                      : v < shown
                        ? dark ? "bg-[#6A6A6E] hover:bg-on-dark-dim" : "bg-faint hover:bg-muted"
                        : dark ? "bg-line-dark hover:bg-[#6A6A6E]" : "bg-line-2 hover:bg-faint",
                  )}
                />
              );
            })}
          </div>
        )}
        <div className="flex shrink-0 items-center gap-3 text-[13px] whitespace-nowrap">
          <span className="tabular-nums" aria-live="polite">
            <b className="font-semibold">{counter}</b> <span className={dim}>of {pageCount}</span>
          </span>
          {settings.showBranding && (
            <>
              <span className={cn("h-3.5 w-px", dark ? "bg-line-dark" : "bg-line-2")} />
              <Link href="/" target={variant === "embed" ? "_blank" : undefined} className={cn("hover:underline", dim)}>
                Made with <span className={cn("font-serif italic", fg)}>Flipbook</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
