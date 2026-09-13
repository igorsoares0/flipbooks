import { SquarePlus } from "lucide-react";
import type { Metadata } from "next";
import { OpenEditorButton } from "@/components/flipbook/open-editor-button";
import { PdfDropzone } from "@/components/flipbook/pdf-dropzone";
import { TemplateGallery } from "@/components/flipbook/template-gallery";
import { createFlipbookAction } from "@/lib/actions/flipbooks";
import { getBilling } from "@/lib/data";
import { templatesWithCovers } from "@/lib/templates";

export const metadata: Metadata = { title: "Create flipbook" };

export default async function CreateFlipbookPage() {
  const billing = await getBilling();
  const { maxPdfBytes, maxPdfPages } = billing.entitlements;
  const planName = billing.plan === "LIFETIME" ? "Lifetime" : "Free";

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-[22px]">
      <div>
        <h1 className="mt-1 mb-1.5 font-serif text-[34px] leading-[1.1] tracking-[-0.6px]">Create a flipbook</h1>
        <p className="text-[13.5px] text-muted">Two ways in. Both end up in the same viewer, publishing and analytics.</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-4">
        <PdfDropzone maxBytes={maxPdfBytes} maxPages={maxPdfPages} planName={planName} />

        <div className="flex flex-col items-center rounded-2xl border border-line bg-surface p-[26px] text-center">
          <div className="mb-3.5 flex size-[46px] items-center justify-center rounded-xl bg-surface-alt">
            <SquarePlus className="size-5" strokeWidth={1.6} />
          </div>
          <h2 className="text-[15px] font-semibold">From scratch</h2>
          <p className="mt-[7px] mb-4 max-w-[280px] text-[12.5px] leading-[1.55] text-pretty text-muted">
            Open the canvas editor with a blank page, or start from one of the templates below.
          </p>
          <form action={createFlipbookAction}>
            <OpenEditorButton />
          </form>
          <div className="mt-3 font-mono text-[10px] font-medium text-muted-3">CANVAS · AUTOSAVE + UNDO</div>
        </div>
      </div>

      <TemplateGallery templates={templatesWithCovers()} />
    </div>
  );
}
