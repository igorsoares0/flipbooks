// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { deleteFlipbookAction, duplicateFlipbookAction } from "@/lib/actions/flipbooks";
import { FlipbookTable, type FlipbookRow } from "./flipbook-table";

// In the browser Next swaps server actions for network stubs; tests do the same.
vi.mock("@/lib/actions/flipbooks", () => ({
  duplicateFlipbookAction: vi.fn(async () => ({ ok: true })),
  deleteFlipbookAction: vi.fn(async () => ({ ok: true })),
}));

const row = (overrides: Partial<FlipbookRow>): FlipbookRow => ({
  id: "fb_1",
  slug: "book",
  title: "Book",
  type: "PDF",
  status: "PUBLISHED",
  meta: "10 pages",
  views: "1,000",
  updated: "2h ago",
  tint: ["#EEEEEE", "#DDDDDD"],
  hasPages: true,
  ...overrides,
});

const rows = [
  row({ id: "fb_a", slug: "summer", title: "Summer Catalog", type: "PDF" }),
  row({ id: "fb_b", slug: "brand", title: "Brand Guidelines", type: "CANVAS" }),
  row({ id: "fb_c", slug: "annual", title: "Annual Report", status: "PROCESSING", hasPages: false }),
];

const titles = () => screen.queryAllByText(/Catalog|Guidelines|Report/).map((el) => el.textContent);

describe("FlipbookTable", () => {
  it("filters rows by type", async () => {
    const user = userEvent.setup();
    render(<FlipbookTable title="Recent flipbooks" rows={rows} />);
    expect(titles()).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "Canvas" }));
    expect(titles()).toEqual(["Brand Guidelines"]);
    expect(screen.getByRole("button", { name: "Canvas" }).getAttribute("aria-pressed")).toBe("true");

    await user.click(screen.getByRole("button", { name: "PDF" }));
    expect(titles()).toEqual(["Summer Catalog", "Annual Report"]);

    await user.click(screen.getByRole("button", { name: "All" }));
    expect(titles()).toHaveLength(3);
  });

  it("links to the editor and the public viewer", () => {
    render(<FlipbookTable title="Recent flipbooks" rows={rows} />);
    const edits = screen.getAllByRole("link", { name: "Edit" });
    expect(edits[0].getAttribute("href")).toBe("/dashboard/flipbooks/fb_a/editor");
    expect(screen.getByRole("link", { name: "Preview Summer Catalog" }).getAttribute("href")).toBe("/f/summer");
  });

  it("disables edit and preview while a book has no pages", () => {
    render(<FlipbookTable title="Recent flipbooks" rows={rows} />);
    expect(screen.getAllByRole("link", { name: "Edit" })).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "Preview Annual Report" })).toBeNull();
    const status = screen.getByText("Processing");
    expect(status).toBeTruthy();
  });

  it("shows the first-run empty state", () => {
    render(<FlipbookTable title="Recent flipbooks" rows={[]} />);
    expect(screen.getByText("No flipbooks yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Create your first flipbook" }).getAttribute("href")).toBe("/dashboard/flipbooks/new");
  });

  it("shows a custom message for empty search results", () => {
    render(<FlipbookTable title="Search results" rows={[]} emptyMessage="No flipbooks match that search." />);
    expect(screen.getByText("No flipbooks match that search.")).toBeTruthy();
    expect(screen.queryByText("No flipbooks yet")).toBeNull();
  });

  it("explains an empty filter", async () => {
    const user = userEvent.setup();
    render(<FlipbookTable title="Recent flipbooks" rows={[rows[0]]} />);
    await user.click(screen.getByRole("button", { name: "Canvas" }));
    const table = screen.getByRole("heading", { name: "Recent flipbooks" }).closest("section")!;
    expect(within(table).getByText("No canvas flipbooks yet.")).toBeTruthy();
  });
});

describe("row menu", () => {
  it("duplicates from the menu and closes it", async () => {
    const user = userEvent.setup();
    render(<FlipbookTable title="Recent flipbooks" rows={rows} />);
    await user.click(screen.getByRole("button", { name: "More actions for Summer Catalog" }));
    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Settings" }).getAttribute("href")).toBe("/dashboard/flipbooks/fb_a/settings");
    await user.click(within(menu).getByRole("menuitem", { name: "Duplicate" }));
    expect(duplicateFlipbookAction).toHaveBeenCalledWith("fb_a");
    await vi.waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("asks for confirmation before deleting", async () => {
    const user = userEvent.setup();
    render(<FlipbookTable title="Recent flipbooks" rows={rows} />);
    await user.click(screen.getByRole("button", { name: "More actions for Brand Guidelines" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(deleteFlipbookAction).not.toHaveBeenCalled();
    await user.click(screen.getByRole("menuitem", { name: "Confirm delete" }));
    expect(deleteFlipbookAction).toHaveBeenCalledWith("fb_b");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<FlipbookTable title="Recent flipbooks" rows={rows} />);
    await user.click(screen.getByRole("button", { name: "More actions for Summer Catalog" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
