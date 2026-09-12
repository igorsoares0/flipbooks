"use client";

import { ElementContent, elementBoxStyle, PageCanvas } from "@/components/flipbook/page-canvas";
import type { PageElement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useActivePage, useEditor } from "../state/editor-context";

const HANDLE = "absolute size-[7px] border-[1.5px] border-accent bg-white";

function SelectionOutline({ element }: { element: PageElement }) {
  const round = element.type === "SHAPE" && element.properties.shape === "ellipse";
  const inset = element.type === "TEXT" ? "-inset-2" : element.type === "IMAGE" ? "-inset-[1.5px]" : "-inset-1.5";
  return (
    <div className={cn("pointer-events-none absolute border-[1.5px] border-accent", inset, round && "rounded-full")}>
      {!round && (
        <>
          <span className={cn(HANDLE, "-top-1 -left-1")} />
          <span className={cn(HANDLE, "-top-1 -right-1")} />
          <span className={cn(HANDLE, "-bottom-1 -left-1")} />
          <span className={cn(HANDLE, "-right-1 -bottom-1")} />
        </>
      )}
    </div>
  );
}

export function Artboard() {
  const page = useActivePage();
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);

  return (
    <div className="flex flex-1 overflow-auto p-7">
      {/* m-auto centers the artboard while still allowing scroll when it is larger than the viewport.
          Element clicks stop propagation, so a click reaching this wrapper selects the page. */}
      <div className="m-auto shrink-0 shadow-canvas" onClick={() => select(null)}>
        <PageCanvas
          page={page}
          style={{ width: page.width }}
          renderElement={(element) => (
            <div
              key={element.id}
              role="button"
              tabIndex={0}
              aria-label={`Select ${element.name}`}
              aria-pressed={element.id === selectedId}
              className="cursor-pointer outline-none"
              style={elementBoxStyle(element, page)}
              onClick={(e) => {
                e.stopPropagation();
                select(element.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") select(element.id);
              }}
            >
              <ElementContent element={element} page={page} />
              {element.id === selectedId && <SelectionOutline element={element} />}
            </div>
          )}
        />
      </div>
    </div>
  );
}
