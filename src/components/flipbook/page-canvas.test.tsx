// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Page, PageElement } from "@/lib/types";
import { elementBoxStyle, PageCanvas } from "./page-canvas";

const base = { pageId: "p1", rotation: 0, opacity: 1, locked: false, visible: true };

const elements: PageElement[] = [
  {
    ...base,
    id: "shape",
    name: "Ellipse",
    x: 390,
    y: 345,
    width: 130,
    height: 69,
    zIndex: 2,
    type: "SHAPE",
    properties: { shape: "ellipse", fill: "#1B45D6", radius: 0 },
  },
  {
    ...base,
    id: "title",
    name: "Heading",
    x: 52,
    y: 69,
    width: 416,
    height: 100,
    zIndex: 1,
    type: "TEXT",
    properties: {
      runs: [{ text: "Summer " }, { text: "Catalog", italic: true }],
      fontFamily: "serif",
      fontSize: 52,
      fontWeight: 400,
      color: "#17150F",
      align: "left",
      lineHeight: 1.02,
      letterSpacing: -1.5,
    },
  },
  {
    ...base,
    id: "hidden",
    name: "Hidden note",
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    zIndex: 3,
    visible: false,
    type: "TEXT",
    properties: {
      runs: [{ text: "Invisible" }],
      fontFamily: "sans",
      fontSize: 12,
      fontWeight: 400,
      color: "#000",
      align: "left",
      lineHeight: 1.5,
      letterSpacing: 0,
    },
  },
];

const page: Page = {
  id: "p1",
  flipbookId: "fb",
  pageNumber: 1,
  width: 520,
  height: 690,
  background: { color: "#F6F4EF" },
  backgroundImageKey: null,
  elements,
};

describe("elementBoxStyle", () => {
  it("converts page units to percentages so pages scale to any size", () => {
    expect(elementBoxStyle(elements[0], page)).toMatchObject({ left: "75%", top: "50%", width: "25%", height: "10%", zIndex: 2 });
  });

  it("lets text boxes grow with their content", () => {
    expect(elementBoxStyle(elements[1], page).height).toBeUndefined();
  });

  it("applies rotation only when set", () => {
    expect(elementBoxStyle(elements[0], page).transform).toBeUndefined();
    expect(elementBoxStyle({ ...elements[0], rotation: 15 }, page).transform).toBe("rotate(15deg)");
  });
});

describe("PageCanvas", () => {
  it("renders visible elements in z-order with italic runs", () => {
    const { container } = render(<PageCanvas page={page} />);
    expect(screen.getByText("Catalog").tagName).toBe("EM");
    expect(screen.queryByText("Invisible")).toBeNull();
    const layers = Array.from(container.firstElementChild!.children).map((el) => (el as HTMLElement).style.zIndex);
    expect(layers).toEqual(["1", "2"]);
  });

  it("paints the page background and keeps the page aspect ratio", () => {
    const { container } = render(<PageCanvas page={page} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.background).toBe("rgb(246, 244, 239)");
    expect(root.style.aspectRatio).toBe("520 / 690");
  });

  it("lets the editor wrap elements and draw overlays", () => {
    render(
      <PageCanvas page={page} renderElement={(el) => <button key={el.id}>{el.name}</button>}>
        <span>overlay</span>
      </PageCanvas>,
    );
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Heading", "Ellipse"]);
    expect(screen.getByText("overlay")).toBeTruthy();
  });
});
