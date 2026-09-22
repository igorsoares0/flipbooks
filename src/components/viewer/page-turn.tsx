"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { PageCanvas } from "@/components/flipbook/page-canvas";
import { trackPointer } from "@/editor/components/pointer";
import type { Page } from "@/lib/types";
import { cn } from "@/lib/utils";
import { clampView, viewPages, type ViewMode } from "./spreads";
import { useMediaQuery } from "./use-media-query";
import {
  completesOnRelease,
  dragProgress,
  dragSkew,
  ease,
  fold,
  startTurn,
  targetOf,
  TURN_MS,
  turnFrames,
  type Corner,
  type Direction,
  type Point,
  type Turn,
} from "./turn-state";

// The book itself: the settled view, plus the page being folded over. Everything is HTML
// (the same PageCanvas the editor draws), so text stays crisp and selectable through the
// turn — the readers that fold a WebGL curl are folding an image of the page instead.
//
// The fold is two flat layers: what is still lying flat, and the part carried over, clipped
// to polygons `fold()` works out and rotated onto the page underneath. No 3D, no canvas.
//
// The viewer only says which view it wants; this component decides how to get there and
// reports back when the page has landed. Swapping the animation for another engine later is
// a change to this file alone.

/** How much of a page's outer edge can be grabbed to fold it over. */
const GRAB_EDGE = 0.34;

/** Page-unit polygon → a clip-path. A flap with nothing in it collapses to a point. */
function clipOf(points: Point[], aspect: number) {
  if (points.length < 3) return "polygon(0 0, 0 0, 0 0)";
  return `polygon(${points.map((p) => `${(p.x * 100).toFixed(3)}% ${((p.y / aspect) * 100).toFixed(3)}%`).join(", ")})`;
}

function Sheet({ page, side, children }: { page: Page | undefined; side: "left" | "right"; children?: ReactNode }) {
  if (!page) return <div className="bg-paper size-full" />;
  return (
    <PageCanvas page={page} className={cn("size-full", side === "left" ? "rounded-l-[3px]" : "rounded-r-[3px]")} style={{ aspectRatio: "auto" }}>
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          side === "left" ? "shadow-[inset_-14px_0_24px_-18px_rgba(0,0,0,.6)]" : "shadow-[inset_14px_0_24px_-18px_rgba(0,0,0,.45)]",
        )}
      />
      {children}
    </PageCanvas>
  );
}

export function PageTurn({
  pages,
  view,
  settled,
  mode,
  onSettled,
  zoomed,
  folio,
}: {
  pages: Page[];
  /** The view the reader asked for; the turn runs until the book shows it. */
  view: number;
  /**
   * The view on screen right now, which lags `view` for as long as the turn runs. Drawing
   * from this (not from `view`) is what keeps the destination from flashing for a frame
   * before the page lifts.
   */
  settled: number;
  mode: ViewMode;
  /**
   * Called once the page has landed, with the view now on screen. `moved` marks a turn the
   * reader made here (by dragging), which is the only time this should change where they
   * were heading.
   */
  onSettled: (view: number, moved: boolean) => void;
  zoomed: boolean;
  /** Page number badge, drawn on each page. */
  folio: (page: Page, side: "left" | "right") => ReactNode;
}) {
  const pageCount = pages.length;
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [turn, setTurn] = useState<Turn | null>(null);
  // The view the book is showing (or heading to) and the turn in flight. Refs, so the
  // effect that starts a turn never restarts one that is already running.
  const shown = useRef(view);
  const running = useRef<Turn | null>(null);
  const dragged = useRef(false);
  // The latest view asked for, read after a turn lands: clicking Next twice queues two turns.
  const wanted = useRef(view);
  const bookRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number>(0);

  const pageOf = (n: number | null | undefined) => (n ? pages[n - 1] : undefined);

  // The view asked for, kept for after a turn lands: clicking Next twice queues two turns.
  useEffect(() => {
    wanted.current = view;
  }, [view]);

  /** Runs a turn to its end (or back to flat) on its own clock. */
  const animate = useCallback(
    (from: Turn, to: 1 | 0, onLanded?: (view: number) => void) => {
      cancelAnimationFrame(frame.current);
      const start = performance.now();
      const startProgress = from.progress;
      const distance = to - startProgress;
      const duration = Math.max(120, TURN_MS * Math.abs(distance));

      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const next = { ...from, progress: startProgress + distance * ease(t), dragging: false };
        if (t < 1) {
          running.current = next;
          setTurn(next);
          frame.current = requestAnimationFrame(step);
          return;
        }
        running.current = null;
        setTurn(null);
        if (to === 1) onLanded?.(clampView(targetOf(from), pageCount, mode));
      };
      frame.current = requestAnimationFrame(step);
    },
    [mode, pageCount],
  );

  /** The page has landed: tell the viewer, then take a turn asked for while this one ran. */
  const land = useCallback(
    function landed(next: number) {
      shown.current = next;
      const moved = dragged.current;
      dragged.current = false;
      onSettled(next, moved);

      // A dragged page landed where the reader took it, and the viewer hears about it only
      // now — without this, the stale `wanted` reads as a queued turn and bounces back.
      if (moved) wanted.current = next;
      const queued = wanted.current;
      if (queued === next) return;
      // Asked for somewhere further off while this page was in the air (clicking Next over
      // and over): go straight there rather than folding every sheet on the way.
      if (Math.abs(queued - next) !== 1 || reducedMotion) {
        shown.current = queued;
        onSettled(clampView(queued, pageCount, mode), false);
        return;
      }
      const begun = startTurn(next, queued > next ? "forward" : "backward", pageCount, mode);
      if (!begun) return;
      running.current = begun;
      animate(begun, 1, landed);
    },
    [animate, mode, onSettled, pageCount, reducedMotion],
  );

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // The viewer asked for another view: turn one page, or jump straight there.
  useEffect(() => {
    const from = shown.current;
    if (view === from || running.current) return;
    const oneStep = Math.abs(view - from) === 1;
    const direction: Direction = view > from ? "forward" : "backward";
    const next = oneStep && !reducedMotion ? startTurn(from, direction, pageCount, mode) : null;
    shown.current = view;
    if (!next) {
      onSettled(clampView(view, pageCount, mode), false);
      return;
    }
    // Nothing is set synchronously: the first animation frame paints the page still flat.
    running.current = next;
    animate(next, 1, land);
  }, [view, mode, pageCount, reducedMotion, animate, land, onSettled]);

  /** Dragging a page's outer corner carries it over; releasing completes or springs back. */
  const startDrag = (event: ReactPointerEvent, side: "left" | "right") => {
    if (event.button !== 0 || turn || reducedMotion) return;
    const box = bookRef.current?.getBoundingClientRect();
    if (!box) return;
    const pageWidth = mode === "single" ? box.width : box.width / 2;
    const grabbed = side === "right" ? box.right - event.clientX < pageWidth * GRAB_EDGE : event.clientX - box.left < pageWidth * GRAB_EDGE;
    if (!grabbed) return;

    const direction: Direction = side === "right" ? "forward" : "backward";
    // The half of the page the reader took hold of is the corner that comes over.
    const corner: Corner = event.clientY > box.top + box.height / 2 ? "bottom" : "top";
    const begun = startTurn(shown.current, direction, pageCount, mode, { dragging: true, corner });
    if (!begun) return;

    const start = { x: event.clientX, y: event.clientY };
    let last = { progress: 0, at: performance.now() };
    let current = begun;
    running.current = begun;
    dragged.current = true;
    setTurn(begun);

    trackPointer(event, {
      move: (move) => {
        const progress = dragProgress(begun, move.clientX - start.x, pageWidth);
        const now = performance.now();
        // Keep the last step's speed, so a flick completes even from a short drag.
        if (now - last.at > 16) last = { progress, at: now };
        current = { ...begun, progress, skew: dragSkew(move.clientY - start.y, box.height), dragging: true };
        setTurn(current);
      },
      end: (released) => {
        const elapsed = Math.max(1, performance.now() - last.at);
        const speed = released ? Math.abs(current.progress - last.progress) / elapsed : 0;
        const completes = completesOnRelease(current.progress, speed);
        if (!completes) dragged.current = false;
        animate({ ...current, dragging: false }, completes ? 1 : 0, land);
      },
    });
  };

  const frames = turn ? turnFrames(turn, pageCount, mode) : null;
  // While a turn runs, the fold's own frames say which pages lie flat underneath it.
  const settledPages = frames ?? viewPages(settled, pageCount, mode);
  const single = mode === "single";
  const sample = pages[0];
  const pageRatio = sample ? sample.width / sample.height : 0.75;
  const ratio = single ? pageRatio : pageRatio * 2;
  const aspect = 1 / pageRatio;
  const creased = turn ? fold(turn, aspect) : null;
  const lift = turn ? Math.sin(turn.progress * Math.PI) : 0;
  // The turning page covers one half of the book (the whole of it on a phone).
  const half = cn("absolute top-0 h-full", single ? "w-full" : "w-1/2");

  return (
    <div className="flex h-full min-w-0 flex-1 items-center justify-center overflow-hidden">
      {/* Height-driven sizing is load-bearing: an auto-width aspect-ratio flex item collapses. */}
      <div
        ref={bookRef}
        data-testid="book"
        // Not clipped: a page swinging over sweeps outside the book, the way paper does. The
        // reader area around it does the clipping.
        className="relative flex max-w-full drop-shadow-[0_24px_70px_rgba(0,0,0,.55)]"
        style={
          {
            aspectRatio: ratio,
            height: `min(${single ? 80 : 74}vh, 100%, calc((100vw - ${single ? 24 : 176}px) / ${ratio}))`,
            transform: zoomed ? "scale(1.3)" : undefined,
          } as CSSProperties
        }
      >
        {!single && (
          <div className="h-full w-1/2 touch-pan-y select-none" onPointerDown={(e) => startDrag(e, "left")}>
            {settledPages.left && <Sheet page={pageOf(settledPages.left)} side="left">{folio(pages[settledPages.left - 1], "left")}</Sheet>}
          </div>
        )}
        <div className={cn("h-full touch-pan-y select-none", single ? "w-full" : "w-1/2")} onPointerDown={(e) => startDrag(e, "right")}>
          {settledPages.right && <Sheet page={pageOf(settledPages.right)} side="right">{folio(pages[settledPages.right - 1], "right")}</Sheet>}
        </div>

        {turn && frames && creased && (
          <>
            {/* What is still lying flat of the page being turned. */}
            <div
              aria-hidden
              className={cn(half, frames.side === "right" ? "right-0" : "left-0")}
              style={{ clipPath: clipOf(creased.flat, aspect), zIndex: 2 }}
            >
              <Sheet page={pageOf(frames.front)} side={frames.side}>
                {frames.front && folio(pages[frames.front - 1], frames.side)}
              </Sheet>
            </div>

            {/* The part carried over, showing the sheet's other face. */}
            <div
              data-testid="turning-leaf"
              aria-hidden
              className={cn(half, frames.side === "right" ? "right-0" : "left-0")}
              style={{
                transform: `translate(${(creased.matrix[4] * 100).toFixed(3)}%, ${((creased.matrix[5] / aspect) * 100).toFixed(3)}%) matrix(${creased.matrix.slice(0, 4).map((n) => n.toFixed(6)).join(", ")}, 0, 0)`,
                transformOrigin: "0 0",
                // On the wrapper, not on the clipped layer: a clip-path would cut the shadow off.
                filter: `drop-shadow(0 0 ${(14 * lift).toFixed(1)}px rgba(0,0,0,${(0.5 * lift).toFixed(2)}))`,
                zIndex: 3,
              }}
            >
              <div className="size-full" style={{ clipPath: clipOf(creased.flap, aspect) }}>
                <Sheet page={pageOf(frames.back)} side={frames.side === "right" ? "left" : "right"}>
                  {frames.back && folio(pages[frames.back - 1], frames.side === "right" ? "left" : "right")}
                </Sheet>
                {/* Shading that runs away from the crease, which is what sells the paper. */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `linear-gradient(${creased.shade.toFixed(2)}deg, rgba(0,0,0,0) ${(creased.crease * 100).toFixed(2)}%, rgba(0,0,0,.32) ${(creased.crease * 100 + 0.8).toFixed(2)}%, rgba(0,0,0,0) ${(creased.shadeTo * 100).toFixed(2)}%)`,
                    opacity: 0.45 + 0.55 * lift,
                  }}
                />
                {/* The back of a sheet held up to the light is never as bright as the front. */}
                <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: 0.05 + 0.07 * lift }} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
