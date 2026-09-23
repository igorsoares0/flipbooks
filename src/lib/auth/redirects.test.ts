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

  it("blocks paths a browser reads as another host", () => {
    // Browsers strip tabs and newlines, so these become "//evil.example".
    expect(safeNext("/\t/evil.example")).toBe("/dashboard");
    expect(safeNext("/\n/evil.example")).toBe("/dashboard");
    expect(safeNext("/\r\n/evil.example")).toBe("/dashboard");
    expect(safeNext("/\t\\evil.example")).toBe("/dashboard");
    expect(safeNext("/%09/evil.example")).toBe("/%09/evil.example");
  });
});
