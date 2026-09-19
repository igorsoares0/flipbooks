"use client";

import { useCallback, useEffect, useRef } from "react";

// Sends reader events to /api/analytics/events (see src/lib/analytics/ingest.ts): one VIEW
// per visit, a PAGE_VIEW per page shown with the time spent on its spread, and SHARE /
// DOWNLOAD clicks. Batched, and sent with sendBeacon so events survive the tab closing.

export type ReaderEvent = { type: "VIEW" | "PAGE_VIEW" | "SHARE" | "DOWNLOAD"; page?: number; durationMs?: number };

const ENDPOINT = "/api/analytics/events";
const FLUSH_EVERY_MS = 5_000;
const MAX_BATCH = 50;
const SESSION_KEY = "flipbook:reader-session";

/** 32 random hex characters. getRandomValues works everywhere, unlike randomUUID, which
 * needs a secure context (an embed on a plain-http page doesn't have one). */
function randomId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
}

function sessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = randomId();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    // Storage blocked (private mode, sandboxed iframe): one id per page load.
    return randomId();
  }
}

/** Page events for a spread that was on screen for `durationMs`: the time goes on its first page. */
export function spreadEvents(pages: number[], durationMs: number): ReaderEvent[] {
  return pages.map((page, i) => (i === 0 ? { type: "PAGE_VIEW", page, durationMs: Math.round(durationMs) } : { type: "PAGE_VIEW", page }));
}

/** Splits queued events into request-sized batches. */
export function batches(events: ReaderEvent[], size = MAX_BATCH) {
  const out: ReaderEvent[][] = [];
  for (let i = 0; i < events.length; i += size) out.push(events.slice(i, i + size));
  return out;
}

function send(flipbookId: string, session: string, events: ReaderEvent[]) {
  for (const chunk of batches(events)) {
    const body = JSON.stringify({ flipbookId, sessionId: session, events: chunk });
    const sent = typeof navigator.sendBeacon === "function" && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
    if (!sent) void fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => undefined);
  }
}

/**
 * Tracks one reader of `flipbookId` while `visiblePages` are on screen. Pass null to
 * disable (previews that aren't public). Returns `track` for one-off events.
 */
export function useReaderAnalytics(flipbookId: string | null, visiblePages: number[]) {
  const queue = useRef<ReaderEvent[]>([]);
  const session = useRef<string | null>(null);
  const spread = useRef<{ pages: number[]; since: number } | null>(null);
  const pagesKey = visiblePages.join(",");

  const flush = useCallback(() => {
    if (!flipbookId || !session.current || queue.current.length === 0) return;
    send(flipbookId, session.current, queue.current);
    queue.current = [];
  }, [flipbookId]);

  /** Records the time spent on the spread being left. */
  const closeSpread = useCallback(() => {
    const current = spread.current;
    if (!current) return;
    spread.current = null;
    queue.current.push(...spreadEvents(current.pages, performance.now() - current.since));
  }, []);

  const track = useCallback(
    (type: ReaderEvent["type"]) => {
      if (!flipbookId) return;
      queue.current.push({ type });
      flush();
    },
    [flipbookId, flush],
  );

  // One VIEW per visit, plus a periodic flush.
  useEffect(() => {
    if (!flipbookId) return;
    session.current = sessionId();
    queue.current.push({ type: "VIEW" });
    const timer = setInterval(flush, FLUSH_EVERY_MS);
    return () => clearInterval(timer);
  }, [flipbookId, flush]);

  // Each spread shown: time it until the reader turns the page.
  useEffect(() => {
    if (!flipbookId || !pagesKey) return;
    spread.current = { pages: pagesKey.split(",").map(Number), since: performance.now() };
    return closeSpread;
  }, [flipbookId, pagesKey, closeSpread]);

  // Leaving or hiding the tab ends the current spread's timer; coming back restarts it.
  useEffect(() => {
    if (!flipbookId) return;
    const onHide = () => {
      closeSpread();
      flush();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHide();
      else if (!spread.current && pagesKey) spread.current = { pages: pagesKey.split(",").map(Number), since: performance.now() };
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flipbookId, pagesKey, closeSpread, flush]);

  return { track };
}
