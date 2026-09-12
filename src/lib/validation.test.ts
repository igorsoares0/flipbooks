import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./flipbook-rules";
import { documentSchema, flipbookPatchSchema } from "./validation";

const page = {
  id: "p1",
  pageNumber: 1,
  width: 520,
  height: 690,
  background: { color: "#FFFFFF" },
  backgroundImageKey: null,
  elements: [
    {
      id: "e1",
      pageId: "p1",
      name: "Ellipse",
      x: 10,
      y: 20,
      width: 120,
      height: 120,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      locked: false,
      visible: true,
      type: "SHAPE",
      properties: { shape: "ellipse", fill: "#1B45D6", radius: 0 },
    },
  ],
};

describe("documentSchema", () => {
  it("accepts a well-formed document", () => {
    expect(documentSchema.safeParse([page]).success).toBe(true);
  });

  it("rejects empty documents and unknown element types", () => {
    expect(documentSchema.safeParse([]).success).toBe(false);
    const bad = { ...page, elements: [{ ...page.elements[0], type: "VIDEO" }] };
    expect(documentSchema.safeParse([bad]).success).toBe(false);
  });

  it("rejects values that could break rendering", () => {
    const withColor = (fill: string) => ({ ...page, elements: [{ ...page.elements[0], properties: { shape: "rect", fill, radius: 0 } }] });
    expect(documentSchema.safeParse([withColor("red; background:url(x)")]).success).toBe(false);
    expect(documentSchema.safeParse([withColor("rgba(23,21,15,.13)")]).success).toBe(true);
    expect(documentSchema.safeParse([{ ...page, elements: [{ ...page.elements[0], opacity: 3 }] }]).success).toBe(false);
    expect(documentSchema.safeParse([{ ...page, elements: [{ ...page.elements[0], x: Number.NaN }] }]).success).toBe(false);
  });

  it("drops unknown keys instead of storing them", () => {
    const parsed = documentSchema.parse([{ ...page, evil: "<script>" }]);
    expect(parsed[0]).not.toHaveProperty("evil");
  });
});

describe("flipbookPatchSchema", () => {
  it("accepts partial settings patches", () => {
    expect(flipbookPatchSchema.parse({ title: "  New title " })).toEqual({ title: "New title" });
    expect(flipbookPatchSchema.safeParse({ settings: DEFAULT_SETTINGS }).success).toBe(true);
  });

  it("rejects empty titles, long descriptions and unknown visibility", () => {
    expect(flipbookPatchSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(flipbookPatchSchema.safeParse({ description: "x".repeat(161) }).success).toBe(false);
    expect(flipbookPatchSchema.safeParse({ visibility: "SECRET" }).success).toBe(false);
  });

  it("never lets clients set server-owned fields", () => {
    const parsed = flipbookPatchSchema.parse({ title: "x", status: "PUBLISHED", userId: "someone-else" });
    expect(parsed).toEqual({ title: "x" });
  });
});
