// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteFlipbookAction } from "@/lib/actions/flipbooks";
import { finishPdfUpload, startPdfUpload } from "@/lib/actions/uploads";
import { checkPdfFile, PdfDropzone } from "./pdf-dropzone";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/actions/uploads", () => ({
  startPdfUpload: vi.fn(async () => ({ ok: true, flipbookId: "fb_new", uploadUrl: "https://storage.test/put", contentType: "application/pdf" })),
  finishPdfUpload: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/lib/actions/flipbooks", () => ({ deleteFlipbookAction: vi.fn(async () => ({ ok: true })) }));

/** Minimal XMLHttpRequest stand-in the test drives by hand. */
class FakeXhr {
  static last: FakeXhr;
  upload = { onprogress: null as null | ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) };
  status = 0;
  headers: Record<string, string> = {};
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  onabort: null | (() => void) = null;
  method = "";
  url = "";
  body: unknown;
  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: unknown) {
    this.body = body;
  }
  abort() {
    this.onabort?.();
  }
  progress(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total });
  }
  finish(status = 200) {
    this.status = status;
    this.onload?.();
  }
}

const pdf = (size = 1_000, name = "summer.pdf") => {
  const file = new File(["%PDF-1.7"], name, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

const input = () => screen.getByLabelText("Choose a PDF") as HTMLInputElement;

beforeEach(() => {
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllGlobals());

describe("checkPdfFile", () => {
  it("accepts PDFs within the plan limit", () => {
    expect(checkPdfFile({ name: "a.pdf", type: "application/pdf", size: 10 }, 100)).toBeNull();
    expect(checkPdfFile({ name: "A.PDF", type: "", size: 10 }, 100)).toBeNull();
  });

  it("explains what is wrong otherwise", () => {
    expect(checkPdfFile({ name: "a.docx", type: "application/msword", size: 10 }, 100)).toMatch(/isn't a PDF/);
    expect(checkPdfFile({ name: "a.pdf", type: "application/pdf", size: 0 }, 100)).toMatch(/empty/);
    expect(checkPdfFile({ name: "a.pdf", type: "application/pdf", size: 25e6 }, 20e6)).toBe(
      "That file is 25.0 MB. Your plan allows PDFs up to 20 MB.",
    );
  });
});

describe("PdfDropzone", () => {
  it("uploads straight to storage with progress, then confirms and opens the list", async () => {
    render(<PdfDropzone maxBytes={100e6} maxPages={300} planName="Lifetime" />);
    fireEvent.change(input(), { target: { files: [pdf(2_000)] } });

    await vi.waitFor(() => expect(FakeXhr.last?.url).toBe("https://storage.test/put"));
    expect(startPdfUpload).toHaveBeenCalledWith({ filename: "summer.pdf", size: 2_000 });
    expect(FakeXhr.last.method).toBe("PUT");
    expect(FakeXhr.last.headers["Content-Type"]).toBe("application/pdf");

    FakeXhr.last.progress(500, 2_000);
    expect(await screen.findByText("25%")).toBeTruthy();
    FakeXhr.last.finish(200);

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/flipbooks"));
    expect(finishPdfUpload).toHaveBeenCalledWith("fb_new");
  });

  it("refuses files before contacting the server", async () => {
    render(<PdfDropzone maxBytes={20e6} maxPages={50} planName="Free" />);
    fireEvent.change(input(), { target: { files: [pdf(30e6)] } });
    expect((await screen.findByRole("alert")).textContent).toMatch(/up to 20 MB/);
    expect(startPdfUpload).not.toHaveBeenCalled();
  });

  it("accepts a dropped file", async () => {
    render(<PdfDropzone maxBytes={100e6} maxPages={300} planName="Lifetime" />);
    const zone = screen.getByText("From PDF").parentElement!;
    fireEvent.drop(zone, { dataTransfer: { files: [pdf()] } });
    await vi.waitFor(() => expect(startPdfUpload).toHaveBeenCalled());
  });

  it("shows server-side refusals", async () => {
    vi.mocked(startPdfUpload).mockResolvedValueOnce({ ok: false, error: "This upload would go over your storage limit." });
    render(<PdfDropzone maxBytes={100e6} maxPages={300} planName="Lifetime" />);
    fireEvent.change(input(), { target: { files: [pdf()] } });
    expect((await screen.findByRole("alert")).textContent).toMatch(/storage limit/);
  });

  it("cancelling aborts the upload and removes the half-created flipbook", async () => {
    const user = userEvent.setup();
    render(<PdfDropzone maxBytes={100e6} maxPages={300} planName="Lifetime" />);
    fireEvent.change(input(), { target: { files: [pdf()] } });
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    await vi.waitFor(() => expect(deleteFlipbookAction).toHaveBeenCalledWith("fb_new"));
    expect(screen.getByRole("button", { name: "Choose file" })).toBeTruthy();
    expect(finishPdfUpload).not.toHaveBeenCalled();
  });

  it("reports a failed transfer and cleans up", async () => {
    render(<PdfDropzone maxBytes={100e6} maxPages={300} planName="Lifetime" />);
    fireEvent.change(input(), { target: { files: [pdf()] } });
    await vi.waitFor(() => expect(FakeXhr.last?.url).toBeTruthy());
    FakeXhr.last.finish(403);
    expect((await screen.findByRole("alert")).textContent).toMatch(/Storage answered 403/);
    expect(deleteFlipbookAction).toHaveBeenCalledWith("fb_new");
  });
});
