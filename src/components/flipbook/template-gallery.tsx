"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createFlipbookAction } from "@/lib/actions/flipbooks";
import type { Template, TemplateCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORIES: TemplateCategory[] = ["Magazines", "Catalogs", "Business", "Brochures", "Portfolios", "Reports", "Marketing"];

function TemplateCard({ template }: { template: Template }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-label={`Use the ${template.name} template`} className="group w-full text-left disabled:cursor-wait">
      <div
        className={cn("relative aspect-[3/4] overflow-hidden rounded-[10px] border border-line group-hover:border-ink", pending && "opacity-60")}
        style={{ background: template.tint }}
      >
        <div className="absolute inset-3 flex flex-col gap-1.5">
          <div className="h-[34%] rounded bg-[rgba(23,21,15,.10)]" />
          <div className="h-[7px] w-[72%] rounded-[3px] bg-[rgba(23,21,15,.28)]" />
          <div className="h-[5px] w-[90%] rounded-[3px] bg-[rgba(23,21,15,.13)]" />
          <div className="h-[5px] w-[80%] rounded-[3px] bg-[rgba(23,21,15,.13)]" />
          <div className="mt-auto h-4 w-[44%] rounded-[3px] bg-[rgba(23,21,15,.16)]" />
        </div>
      </div>
      <div className="mt-2 text-[12.5px] font-semibold">{pending ? "Creating…" : template.name}</div>
      <div className="mt-0.5 text-[11px] text-muted-2">{template.pageCount} pages</div>
    </button>
  );
}

export function TemplateGallery({ templates }: { templates: Template[] }) {
  const [category, setCategory] = useState<TemplateCategory | null>(null);
  const visible = category ? templates.filter((t) => t.category === category) : templates;

  return (
    <section>
      <div className="mt-1.5 mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <h2 className="text-[13.5px] font-semibold">Templates</h2>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted-2" role="tablist" aria-label="Template categories">
          {[null, ...CATEGORIES].map((c) => (
            <button
              key={c ?? "all"}
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                "border-b-[1.5px] pb-0.5",
                category === c ? "border-ink font-semibold text-ink" : "border-transparent hover:text-ink",
              )}
            >
              {c ?? "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5">
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
