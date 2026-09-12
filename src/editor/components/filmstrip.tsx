"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { PageCanvas } from "@/components/flipbook/page-canvas";
import { cn } from "@/lib/utils";
import { useEditor } from "../state/editor-context";

export function Filmstrip() {
  const pages = useEditor((s) => s.pages);
  const activePageId = useEditor((s) => s.activePageId);
  const setActivePage = useEditor((s) => s.setActivePage);
  const addPage = useEditor((s) => s.addPage);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activePageId]);

  return (
    <div className="flex h-[104px] shrink-0 items-center gap-2.5 overflow-x-auto border-t border-line bg-surface px-4" aria-label="Pages">
      {pages.map((page) => {
        const active = page.id === activePageId;
        return (
          <button
            key={page.id}
            ref={active ? activeRef : undefined}
            onClick={() => setActivePage(page.id)}
            aria-label={`Page ${page.pageNumber}`}
            aria-current={active ? "page" : undefined}
            className="shrink-0 text-center"
          >
            <PageCanvas
              page={page}
              className={cn(
                "pointer-events-none w-[54px] rounded-[3px] shadow-thumb",
                active ? "outline-2 -outline-offset-2 outline-accent" : "outline-1 -outline-offset-1 outline-line",
              )}
              style={{ outlineStyle: "solid" }}
            />
            <div className="mt-1 font-mono text-[9.5px] font-medium text-muted-2">{page.pageNumber}</div>
          </button>
        );
      })}
      <button
        onClick={addPage}
        aria-label="Add page"
        className="mb-[18px] flex h-[70px] w-[54px] shrink-0 items-center justify-center rounded border-[1.5px] border-dashed border-line-strong bg-surface-sunken text-muted-2 hover:border-accent hover:text-accent"
      >
        <Plus className="size-5" strokeWidth={1.4} />
      </button>
    </div>
  );
}
