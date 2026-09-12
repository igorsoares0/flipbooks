import { describe, expect, it } from "vitest";
import {
  formatCompact,
  formatCount,
  formatDuration,
  formatGb,
  formatMb,
  formatPercentDelta,
  formatRelative,
  formatShortDate,
} from "./format";

describe("format", () => {
  it("formats counts with thousands separators", () => {
    expect(formatCount(12480)).toBe("12,480");
    expect(formatCount(0)).toBe("0");
  });

  it("compacts large numbers to k", () => {
    expect(formatCompact(48190)).toBe("48.2k");
    expect(formatCompact(250000)).toBe("250k");
    expect(formatCompact(999)).toBe("999");
  });

  it("formats durations as m:ss with a real minus sign", () => {
    expect(formatDuration(252)).toBe("4:12");
    expect(formatDuration(204)).toBe("3:24");
    expect(formatDuration(-18)).toBe("−0:18");
  });

  it("formats percent deltas with a sign", () => {
    expect(formatPercentDelta(0.184)).toBe("+18.4%");
    expect(formatPercentDelta(-0.05)).toBe("−5.0%");
  });

  it("formats storage sizes", () => {
    expect(formatGb(2.4e9)).toBe("2.4");
    expect(formatGb(20e9)).toBe("20");
    expect(formatMb(18.4e6)).toBe("18.4 MB");
  });

  it("formats relative times like the dashboard", () => {
    const now = Date.parse("2026-09-12T12:00:00Z");
    const ago = (ms: number) => new Date(now - ms).toISOString();
    expect(formatRelative(ago(20_000), now)).toBe("Just now");
    expect(formatRelative(ago(2 * 60_000), now)).toBe("2m ago");
    expect(formatRelative(ago(2 * 3_600_000), now)).toBe("2h ago");
    expect(formatRelative(ago(30 * 3_600_000), now)).toBe("Yesterday");
    expect(formatRelative("2026-09-04T15:20:00Z", now)).toBe(formatShortDate("2026-09-04T15:20:00Z"));
    expect(formatShortDate("2026-09-04T15:20:00Z")).toBe("Sep 4");
  });
});
