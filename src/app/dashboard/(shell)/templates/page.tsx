import type { Metadata } from "next";
import { TemplateGallery } from "@/components/flipbook/template-gallery";
import { templatesWithCovers } from "@/lib/templates";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  return (
    <div className="flex max-w-[1240px] flex-col gap-7">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
        <h1 className="font-serif text-[40px] leading-none tracking-[-1.2px] md:text-[52px] md:tracking-[-1.6px]">Templates</h1>
        <p className="mb-1.5 max-w-[440px] text-[15px] leading-normal text-ink-2">
          Start from a layout and make it yours. Every template opens as an editable copy.
        </p>
      </div>
      <TemplateGallery templates={templatesWithCovers()} title={null} />
    </div>
  );
}
