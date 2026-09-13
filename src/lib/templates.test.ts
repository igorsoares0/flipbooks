import { describe, expect, it } from "vitest";
import { buildTemplatePages, TEMPLATES } from "./templates";
import { documentSchema } from "./validation";

describe("templates", () => {
  it.each(TEMPLATES.map((t) => [t.name, t]))("%s builds a valid, designed document", (_name, template) => {
    const pages = buildTemplatePages(template.id, "fb_test");
    expect(pages).toHaveLength(template.pageCount);
    expect(documentSchema.safeParse(pages).success).toBe(true);
    expect(pages.every((p) => p.elements.length > 0)).toBe(true);
    expect(pages[0].elements.map((el) => el.name)).toContain("Heading");
  });

  it("gives every page and element a unique id", () => {
    const pages = buildTemplatePages("tpl_report", "fb_x");
    const ids = [...pages.map((p) => p.id), ...pages.flatMap((p) => p.elements.map((el) => el.id))];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("can build just the cover for previews", () => {
    expect(buildTemplatePages("tpl_menu", "preview", 1)).toHaveLength(1);
    expect(buildTemplatePages("nope", "x")).toEqual([]);
  });
});
