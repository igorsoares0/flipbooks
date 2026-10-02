"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { PageCanvas } from "@/components/flipbook/page-canvas";
import { createFlipbookAction } from "@/lib/actions/flipbooks";
import type { TemplateWithCover } from "@/lib/templates";
import type { TemplateCategory } from "@/lib/types";
import { tabItem } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const CATEGORIES: TemplateCategory[] = ["Magazines", "Catalogs", "Business", "Brochures", "Portfolios", "Reports", "Marketing"];

function TemplateCard({ template }: { template: TemplateWithCover }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-label={`Use the ${template.name} template`} className="group w-full text-left disabled:cursor-wait">
      {/* The template's real cover, rendered like any page. */}
      <PageCanvas
        page={template.cover}
        className={cn("pointer-events-none shadow-cover group-hover:shadow-[0_0_0_2px_var(--color-accent)]", pending && "opacity-60")}
      />
      <div className="mt-2.5 truncate text-[13.5px] font-semibold">{pending ? "Creating…" : template.name}</div>
      <div className="mt-0.5 text-xs text-muted">{template.pageCount} pages</div>
    </button>
  );
}

export function TemplateGallery({
  templates,
  title = "Templates",
  dense = false,
  className,
}: {
  templates: TemplateWithCover[];
  /** Section title; null when the page's own H1 already says it. */
  title?: string | null;
  /** Eight small covers a row (new flipbook) instead of five. */
  dense?: boolean;
  className?: string;
}) {
  const [category, setCategory] = useState<TemplateCategory | null>(null);
  const visible = category ? templates.filter((t) => t.category === category) : templates;

  return (
    <section className={className}>
      <div className="flex flex-wrap items-baseline gap-x-[26px] gap-y-3 border-b border-line pb-3">
        {title && <h2 className="font-serif text-[30px] leading-none tracking-[-0.8px]">{title}</h2>}
        <div className="flex flex-wrap gap-x-[18px] gap-y-2" role="tablist" aria-label="Template categories">
          {[null, ...CATEGORIES].map((c) => (
            <button key={c ?? "all"} role="tab" aria-selected={category === c} onClick={() => setCategory(c)} className={tabItem(category === c)}>
              {c ?? "All"}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "mt-6 grid gap-y-7",
          dense ? "grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-x-4" : "grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-5",
        )}
      >
        {visible.map((t) => (
          <form key={t.id} action={createFlipbookAction}>
            <input type="hidden" name="templateId" value={t.id} />
            <TemplateCard template={t} />
          </form>
        ))}
      </div>
    </section>
  );
}
