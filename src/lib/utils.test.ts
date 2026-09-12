import { describe, expect, it } from "vitest";
import { cn, isDarkColor, newId } from "./utils";

describe("cn", () => {
  it("lets later utilities override conflicting ones", () => {
    // Regression: without tailwind-merge, icon buttons kept the default padding and the icon collapsed.
    expect(cn("px-[15px] py-[9px] rounded-[9px]", "p-0 rounded-[7px]")).toBe("p-0 rounded-[7px]");
  });

  it("keeps custom color tokens next to font sizes", () => {
    expect(cn("text-[12.5px] text-muted-2")).toBe("text-[12.5px] text-muted-2");
    expect(cn("text-ink", "text-ink-70")).toBe("text-ink-70");
  });

  it("drops falsy values", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });
});

describe("isDarkColor", () => {
  it("classifies the viewer grounds", () => {
    expect(isDarkColor("#17150F")).toBe(true);
    expect(isDarkColor("#26303F")).toBe(true);
    expect(isDarkColor("#F3F1EC")).toBe(false);
  });
});

describe("newId", () => {
  it("prefixes unique ids", () => {
    const a = newId("el");
    expect(a).toMatch(/^el_[0-9a-f]{8}$/);
    expect(newId("el")).not.toBe(a);
  });
});
