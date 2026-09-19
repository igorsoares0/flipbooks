import { describe, expect, it } from "vitest";
import { batches, spreadEvents } from "./reader-analytics";

describe("reader analytics", () => {
  it("counts every page of a spread, with the time on the first", () => {
    expect(spreadEvents([4, 5], 12_345.6)).toEqual([
      { type: "PAGE_VIEW", page: 4, durationMs: 12_346 },
      { type: "PAGE_VIEW", page: 5 },
    ]);
    expect(spreadEvents([1], 800)).toEqual([{ type: "PAGE_VIEW", page: 1, durationMs: 800 }]);
  });

  it("splits long queues into request-sized batches", () => {
    const events = Array.from({ length: 120 }, (_, i) => ({ type: "PAGE_VIEW" as const, page: i + 1 }));
    expect(batches(events).map((b) => b.length)).toEqual([50, 50, 20]);
    expect(batches([])).toEqual([]);
  });
});
