import { SquarePlus, Upload } from "lucide-react";
import type { Metadata } from "next";
import { Button, ButtonLink } from "@/components/ui/button";
import { TemplateGallery } from "@/components/flipbook/template-gallery";
import { DRAFT_FLIPBOOK_ID, getBilling, getTemplates } from "@/lib/data";

export const metadata: Metadata = { title: "Create flipbook" };

const editorHref = `/dashboard/flipbooks/${DRAFT_FLIPBOOK_ID}/editor`;

export default async function CreateFlipbookPage() {
  const [templates, billing] = await Promise.all([getTemplates(), getBilling()]);
  const { maxPdfBytes, maxPdfPages } = billing.entitlements;
  const planName = billing.plan === "LIFETIME" ? "Lifetime" : "Free";

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-[22px]">
      <div>
        <h1 className="mt-1 mb-1.5 font-serif text-[34px] leading-[1.1] tracking-[-0.6px]">Create a flipbook</h1>
        <p className="text-[13.5px] text-muted">Two ways in. Both end up in the same viewer, publishing and analytics.</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-4">
        {/* Upload, validation and processing states arrive with the PDF pipeline phase. */}
        <div className="flex flex-col items-center rounded-2xl border-[1.5px] border-dashed border-line-strong bg-surface p-[26px] text-center hover:border-accent hover:bg-[#FBFBFF]">
          <div className="mb-3.5 flex size-[46px] items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Upload className="size-5" strokeWidth={1.6} />
          </div>
          <h2 className="text-[15px] font-semibold">From PDF</h2>
          <p className="mt-[7px] mb-4 max-w-[280px] text-[12.5px] leading-[1.55] text-pretty text-muted">
            Drag a PDF here or browse. Max {maxPdfBytes / 1e6} MB, up to {maxPdfPages} pages on your {planName} plan.
          </p>
          <Button variant="accent" className="rounded-lg px-4">
            Choose file
          </Button>
          <div className="mt-3 font-mono text-[10px] font-medium text-muted-3">PDF · UPLOAD → R2 → WORKER → READY</div>
        </div>

        <div className="flex flex-col items-center rounded-2xl border border-line bg-surface p-[26px] text-center">
          <div className="mb-3.5 flex size-[46px] items-center justify-center rounded-xl bg-surface-alt">
            <SquarePlus className="size-5" strokeWidth={1.6} />
          </div>
          <h2 className="text-[15px] font-semibold">From scratch</h2>
          <p className="mt-[7px] mb-4 max-w-[280px] text-[12.5px] leading-[1.55] text-pretty text-muted">
            Open the canvas editor with a blank page, or start from one of the templates below.
          </p>
          <ButtonLink href={editorHref} className="rounded-lg px-4">
            Open editor
          </ButtonLink>
          <div className="mt-3 font-mono text-[10px] font-medium text-muted-3">CANVAS · KONVA + ZUSTAND</div>
        </div>
      </div>

      <TemplateGallery templates={templates} editorHref={editorHref} />
    </div>
  );
}
