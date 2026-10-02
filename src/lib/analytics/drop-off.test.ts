import { describe, expect, it } from "vitest";
import { largestDropOff } from "./drop-off";

describe("largestDropOff", () => {
  it("finds the steepest relative drop between consecutive pages", () => {
    // 100 → 90 is −10%, 90 → 50 is −44%, 50 → 40 is −20%.
    expect(largestDropOff([100, 90, 50, 40])).toEqual({ page: 2, drop: 40 / 90 });
  });

  it("measures the drop against the page before, not the first page", () => {
    // 1000 → 500 loses more readers, but 450 → 90 is the steeper share.
    expect(largestDropOff([1000, 500, 450, 90])?.page).toBe(3);
  });

  it("ignores drops under the threshold", () => {
    expect(largestDropOff([100, 95, 90, 86])).toBeNull();
  });

  it("ignores rising pages and empty data", () => {
    expect(largestDropOff([10, 20, 30])).toBeNull();
    expect(largestDropOff([])).toBeNull();
    expect(largestDropOff([0, 0, 5])).toBeNull();
  });
});
