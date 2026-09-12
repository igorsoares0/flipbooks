"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/meter";
import { deleteFlipbookAction } from "@/lib/actions/flipbooks";
import { finishPdfUpload, startPdfUpload } from "@/lib/actions/uploads";
import { formatMb } from "@/lib/format";
import { cn } from "@/lib/utils";

// Upload states were a gap in the design handoff; they reuse the "From PDF" card's tokens.

type State =
  | { step: "idle" }
  | { step: "uploading"; filename: string; progress: number }
  | { step: "finishing"; filename: string }
  | { step: "error"; message: string };

export function checkPdfFile(file: Pick<File, "name" | "type" | "size">, maxBytes: number): string | null {
  const looksLikePdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!looksLikePdf) return "That isn't a PDF. Choose a .pdf file.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > maxBytes) return `That file is ${formatMb(file.size)}. Your plan allows PDFs up to ${maxBytes / 1e6} MB.`;
  return null;
}

/** PUTs the file straight to storage, reporting progress. Resolves false if cancelled. */
function putWithProgress(url: string, file: File, contentType: string, onProgress: (ratio: number) => void, xhrRef: { current: XMLHttpRequest | null }) {
  return new Promise<boolean>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(true) : reject(new Error(`Storage answered ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("The connection dropped during the upload."));
    xhr.onabort = () => resolve(false);
    xhr.send(file);
  });
}

export function PdfDropzone({ maxBytes, maxPages, planName }: { maxBytes: number; maxPages: number; planName: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const xhr = useRef<XMLHttpRequest | null>(null);
  const uploadId = useRef<string | null>(null);
  const [state, setState] = useState<State>({ step: "idle" });
  const [dragging, setDragging] = useState(false);
  const busy = state.step === "uploading" || state.step === "finishing";

  const upload = async (file: File) => {
    const problem = checkPdfFile(file, maxBytes);
    if (problem) return setState({ step: "error", message: problem });

    setState({ step: "uploading", filename: file.name, progress: 0 });
    const started = await startPdfUpload({ filename: file.name, size: file.size });
    if (!started.ok) return setState({ step: "error", message: started.error });
    uploadId.current = started.flipbookId;

    try {
      const completed = await putWithProgress(
        started.uploadUrl,
        file,
        started.contentType,
        (progress) => setState({ step: "uploading", filename: file.name, progress }),
        xhr,
      );
      if (!completed) return;
    } catch (error) {
      await deleteFlipbookAction(started.flipbookId);
      return setState({ step: "error", message: error instanceof Error ? error.message : "The upload failed." });
    }

    setState({ step: "finishing", filename: file.name });
    const finished = await finishPdfUpload(started.flipbookId);
    if (!finished.ok) return setState({ step: "error", message: `We couldn't use that file: ${finished.error}.` });
    router.push("/dashboard/flipbooks");
  };

  const cancel = async () => {
    xhr.current?.abort();
    if (uploadId.current) await deleteFlipbookAction(uploadId.current);
    uploadId.current = null;
    setState({ step: "idle" });
  };

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file && !busy) void upload(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center rounded-2xl border-[1.5px] border-dashed border-line-strong bg-surface p-[26px] text-center hover:border-accent hover:bg-[#FBFBFF]",
        dragging && "border-accent bg-[#FBFBFF]",
        state.step === "error" && "border-danger-line",
      )}
    >
      <div className="mb-3.5 flex size-[46px] items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Upload className="size-5" strokeWidth={1.6} />
      </div>
      <h2 className="text-[15px] font-semibold">From PDF</h2>

      {busy ? (
        <div className="mt-3 mb-4 w-full max-w-[280px]" aria-live="polite">
          <div className="mb-2 flex justify-between gap-3 text-[12px]">
            <span className="truncate text-ink-70">{state.filename}</span>
            <span className="shrink-0 font-mono text-[11px] font-medium text-muted">
              {state.step === "finishing" ? "Checking…" : `${Math.round(state.progress * 100)}%`}
            </span>
          </div>
          <Meter
            value={state.step === "finishing" ? 1 : state.progress}
            className="bg-track"
            barClassName="transition-[width] duration-150"
          />
          <p className="mt-2 text-[11.5px] text-muted-2">
            {state.step === "finishing" ? "Almost there. The pages render in the background." : "Keep this tab open until the upload finishes."}
          </p>
        </div>
      ) : (
        <p className="mt-[7px] mb-4 max-w-[280px] text-[12.5px] leading-[1.55] text-pretty text-muted">
          {dragging
            ? "Drop it here."
            : `Drag a PDF here or browse. Max ${maxBytes / 1e6} MB, up to ${maxPages} pages on your ${planName} plan.`}
        </p>
      )}

      {state.step === "error" && (
        <p role="alert" className="-mt-2 mb-3 max-w-[300px] text-[12px] leading-normal text-danger">
          {state.message}
        </p>
      )}

      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-label="Choose a PDF"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />
      {state.step === "uploading" ? (
        <Button variant="secondary" className="rounded-lg px-4" onClick={cancel}>
          Cancel
        </Button>
      ) : (
        <Button variant="accent" className="rounded-lg px-4" disabled={busy} onClick={() => input.current?.click()}>
          {state.step === "error" ? "Choose another file" : "Choose file"}
        </Button>
      )}
      <div className="mt-3 font-mono text-[10px] font-medium text-muted-3">PDF · UPLOAD → R2 → WORKER → READY</div>
    </div>
  );
}
