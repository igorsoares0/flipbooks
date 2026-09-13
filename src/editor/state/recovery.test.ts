// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Page } from "@/lib/types";
import { discardDraft, draftStorage, readDraft } from "./recovery";

const pages: Page[] = [
  { id: "p1", flipbookId: "fb", pageNumber: 1, width: 520, height: 690, background: { color: "#FFFFFF" }, backgroundImageKey: null, elements: [] },
];
const KEY = "flipbook:draft:fb";

describe("unsaved-work recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T12:00:00Z"));
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it("writes the latest document at most once a second", () => {
    const drafts = draftStorage("fb");
    drafts.write(pages);
    drafts.write([...pages, { ...pages[0], id: "p2" }]);
    expect(localStorage.getItem(KEY)).toBeNull();
    vi.advanceTimersByTime(1_000);
    expect(JSON.parse(localStorage.getItem(KEY)!).pages).toHaveLength(2);
  });

  it("writes immediately on flush and forgets it on clear", () => {
    const drafts = draftStorage("fb");
    drafts.write(pages);
    drafts.flush();
    expect(localStorage.getItem(KEY)).not.toBeNull();
    drafts.write(pages);
    drafts.clear();
    vi.advanceTimersByTime(5_000);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("offers a draft newer than the server copy", () => {
    const drafts = draftStorage("fb");
    drafts.write(pages);
    drafts.flush();
    const draft = readDraft("fb", "2026-09-01T11:59:00Z");
    expect(draft?.pages).toEqual(pages);
  });

  it("drops drafts the server copy has caught up with", () => {
    const drafts = draftStorage("fb");
    drafts.write(pages);
    drafts.flush();
    expect(readDraft("fb", "2026-09-01T12:00:01Z")).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("drops unreadable drafts", () => {
    localStorage.setItem(KEY, "{not json");
    expect(readDraft("fb", "2026-01-01T00:00:00Z")).toBeNull();
    localStorage.setItem(KEY, JSON.stringify({ pages: [], at: Date.now() }));
    expect(readDraft("fb", "2026-01-01T00:00:00Z")).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("discards on request", () => {
    localStorage.setItem(KEY, JSON.stringify({ pages, at: Date.now() }));
    discardDraft("fb");
    expect(readDraft("fb", "2026-01-01T00:00:00Z")).toBeNull();
  });
});
