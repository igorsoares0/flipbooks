"use client";

import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/meter";
import { deleteFlipbookAction } from "@/lib/actions/flipbooks";
import { finishPdfUpload, startPdfUpload } from "@/lib/actions/uploads";
import { formatMb } from "@/lib/format";
import { putWithProgress } from "@/lib/upload-client";
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
    router.push("/dashboard");
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
        "flex items-center gap-7 border-[1.5px] border-dashed border-accent px-8 py-[30px] max-sm:px-5",
        dragging ? "bg-accent-tint" : "bg-accent-wash",
        state.step === "error" && "border-danger",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <h2 className="text-[13px] font-semibold text-accent">From a PDF</h2>
        <p className="font-serif text-[30px] leading-[1.08] tracking-[-0.6px]">{dragging ? "Drop it here." : "Drop a PDF anywhere on this box."}</p>

        {busy ? (
          <div className="w-full max-w-[360px]" aria-live="polite">
            <div className="mb-2 flex justify-between gap-3 text-[13px]">
              <span className="truncate text-ink-2">{state.filename}</span>
              <span className="shrink-0 text-muted tabular-nums">
                {state.step === "finishing" ? "Checking…" : `${Math.round(state.progress * 100)}%`}
              </span>
            </div>
            <Meter value={state.step === "finishing" ? 1 : state.progress} barClassName="transition-[width] duration-150" />
            <p className="mt-2 text-[12.5px] text-muted">
              {state.step === "finishing" ? "Almost there. The pages render in the background." : "Keep this tab open until the upload finishes."}
            </p>
          </div>
        ) : (
          <p className="text-[13.5px] leading-normal text-pretty text-ink-2">
            Max {maxBytes / 1e6} MB, up to {maxPages} pages on your {planName} plan. Pages render in the background, usually in under a minute.
          </p>
        )}

        {state.step === "error" && (
          <p role="alert" className="text-[13px] leading-normal text-danger">
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
        <div className="mt-1.5 flex gap-2.5">
          {state.step === "uploading" ? (
            <Button variant="outline" onClick={cancel}>
              Cancel
            </Button>
          ) : (
            <Button variant="primary" className="px-5" disabled={busy} onClick={() => input.current?.click()}>
              {state.step === "error" ? "Choose another file" : "Choose file"}
            </Button>
          )}
        </div>
      </div>
      <FileUp className="size-10 shrink-0 text-accent max-md:hidden" strokeWidth={1.2} />
    </div>
  );
}
