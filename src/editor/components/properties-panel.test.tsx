// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Page, TextElement } from "@/lib/types";
import { EditorStoreProvider, useEditorStore } from "../state/editor-context";
import type { EditorStore } from "../state/editor-store";
import { PropertiesPanel } from "./properties-panel";

const heading: TextElement = {
  id: "h",
  pageId: "p1",
  name: "Heading",
  x: 44,
  y: 56,
  width: 432,
  height: 60,
  rotation: 0,
  opacity: 1,
  zIndex: 1,
  locked: false,
  visible: true,
  type: "TEXT",
  properties: {
    runs: [{ text: "Hello" }],
    fontFamily: "serif",
    fontSize: 40,
    fontWeight: 400,
    color: "#17150F",
    align: "left",
    lineHeight: 1.1,
    letterSpacing: 0,
  },
};

const page: Page = {
  id: "p1",
  flipbookId: "fb",
  pageNumber: 1,
  width: 520,
  height: 690,
  background: { color: "#FFFFFF" },
  backgroundImageKey: null,
  elements: [heading],
};

function setup() {
  let store!: EditorStore;
  function Grab() {
    store = useEditorStore();
    return null;
  }
  render(
    <EditorStoreProvider pages={[page]} save={async () => ({ ok: true })}>
      <Grab />
      <PropertiesPanel />
    </EditorStoreProvider>,
  );
  const element = () => store.getState().pages[0].elements[0] as TextElement;
  return { store: () => store, element };
}

describe("properties panel", () => {
  it("moves the element when X is typed, as one undo step", async () => {
    const { store, element } = setup();
    const x = screen.getByLabelText("X");
    await userEvent.clear(x);
    await userEvent.type(x, "120");
    expect(element().x).toBe(120);
    expect(store().getState().past.length).toBeLessThanOrEqual(2); // "" is ignored; 1, 12, 120 merge
  });

  it("snaps back to the real value after invalid input", async () => {
    const { element } = setup();
    const width = screen.getByLabelText("Width");
    await userEvent.clear(width);
    await userEvent.tab();
    expect(element().width).toBe(432);
    expect((width as HTMLInputElement).value).toBe("432");
  });

  it("changes the text color from a swatch and the hex field", async () => {
    const { element } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Text color #1B45D6" }));
    expect(element().properties.color).toBe("#1B45D6");

    const hex = screen.getByLabelText("Text color");
    await userEvent.clear(hex);
    await userEvent.type(hex, "c0392b");
    expect(element().properties.color).toBe("#C0392B");
  });

  it("changes typography", async () => {
    const { element } = setup();
    await userEvent.selectOptions(screen.getByLabelText("Font"), "sans");
    await userEvent.selectOptions(screen.getByLabelText("Font weight"), "700");
    await userEvent.click(screen.getByRole("button", { name: "Center" }));
    expect(element().properties).toMatchObject({ fontFamily: "sans", fontWeight: 700, align: "center" });
  });

  it("rotates and fades with the sliders", () => {
    const { element } = setup();
    fireEvent.change(screen.getByLabelText("Rotation"), { target: { value: "45" } });
    fireEvent.change(screen.getByLabelText("Opacity"), { target: { value: "50" } });
    expect(element()).toMatchObject({ rotation: 45, opacity: 0.5 });
  });

  it("locks the element and disables its position fields", async () => {
    const { element } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Lock" }));
    expect(element().locked).toBe(true);
    expect((screen.getByLabelText("X") as HTMLInputElement).disabled).toBe(true);
  });

  it("shows the page's background when nothing is selected", async () => {
    const { store } = setup();
    store().getState().select(null);
    await userEvent.click(await screen.findByRole("button", { name: "Background color #F4EFE6" }));
    expect(store().getState().pages[0].background.color).toBe("#F4EFE6");
    expect((screen.getByRole("button", { name: "Delete page" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
