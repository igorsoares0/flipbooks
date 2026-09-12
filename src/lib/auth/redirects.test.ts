import { describe, expect, it } from "vitest";
import { safeNext } from "./redirects";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/dashboard/flipbooks/fb_1/settings?tab=share")).toBe("/dashboard/flipbooks/fb_1/settings?tab=share");
  });

  it("blocks open redirects", () => {
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("/\\evil.example")).toBe("/dashboard");
    expect(safeNext(undefined)).toBe("/dashboard");
    expect(safeNext(["/a", "/b"])).toBe("/dashboard");
  });
});
