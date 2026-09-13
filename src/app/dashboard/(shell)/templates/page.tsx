import type { Metadata } from "next";
import { TemplateGallery } from "@/components/flipbook/template-gallery";
import { templatesWithCovers } from "@/lib/templates";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
      <div>
        <h1 className="mt-1 mb-1.5 font-serif text-[34px] leading-[1.1] tracking-[-0.6px]">Templates</h1>
        <p className="text-[13.5px] text-muted">Start from a layout and make it yours. Every template opens as an editable copy.</p>
      </div>
      <TemplateGallery templates={templatesWithCovers()} />
    </div>
  );
}
