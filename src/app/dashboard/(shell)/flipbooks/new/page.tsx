import type { Metadata } from "next";
import Link from "next/link";
import { OpenEditorButton } from "@/components/flipbook/open-editor-button";
import { PdfDropzone } from "@/components/flipbook/pdf-dropzone";
import { TemplateGallery } from "@/components/flipbook/template-gallery";
import { createFlipbookAction } from "@/lib/actions/flipbooks";
import { getBilling } from "@/lib/data";
import { templatesWithCovers } from "@/lib/templates";

export const metadata: Metadata = { title: "Create flipbook" };

export default async function CreateFlipbookPage() {
  const billing = await getBilling();
  const { maxPdfBytes, maxPagesPerFlipbook, maxFlipbooks } = billing.entitlements;
  const planName = billing.plan === "PRO" ? "Pro" : "Free";
  const atLimit = billing.usage.flipbooks >= maxFlipbooks;

  return (
    <div className="flex max-w-[1240px] flex-col">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
        <h1 className="font-serif text-[44px] leading-none tracking-[-1.4px] md:text-[60px] md:tracking-[-1.8px]">A new flipbook</h1>
        <p className="mb-2 max-w-[420px] text-[15px] leading-normal text-ink-2">Two ways in. Both end in the same reader, link, embed and analytics.</p>
      </div>

      {atLimit && (
        <p role="status" className="mt-6 bg-accent-tint px-4 py-3 text-[13.5px] text-accent">
          <span className="font-semibold">
            You&apos;ve used all {maxFlipbooks} flipbooks on the {planName} plan.
          </span>{" "}
          Delete one, or{" "}
          <Link href="/dashboard/billing?upgrade=flipbooks" className="font-semibold underline underline-offset-[3px]">
            upgrade to Pro
          </Link>{" "}
          for up to 100.
        </p>
      )}

      <div className="mt-[30px] grid lg:grid-cols-2">
        <PdfDropzone maxBytes={maxPdfBytes} maxPages={maxPagesPerFlipbook} planName={planName} />

        <div className="flex items-center gap-7 border border-ink px-8 py-[30px] max-lg:border-t-0 max-sm:px-5 lg:border-l-0">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <h2 className="text-[13px] font-semibold">From scratch</h2>
            <p className="font-serif text-[30px] leading-[1.08] tracking-[-0.6px]">Open a blank book in the editor.</p>
            <p className="text-[13.5px] leading-normal text-ink-2">Text, images and shapes, with autosave and undo. Or pick a template below.</p>
            <form action={createFlipbookAction} className="mt-1.5">
              <OpenEditorButton />
            </form>
          </div>
          <div className="flex shrink-0 gap-px shadow-[0_8px_20px_rgba(17,17,17,.12)] max-md:hidden" aria-hidden>
            <div className="h-[54px] w-10 bg-white shadow-[inset_0_0_0_1px_var(--color-line)]" />
            <div className="h-[54px] w-10 bg-white shadow-[inset_0_0_0_1px_var(--color-line)]" />
          </div>
        </div>
      </div>

      <TemplateGallery templates={templatesWithCovers()} dense className="mt-10" />
    </div>
  );
}
