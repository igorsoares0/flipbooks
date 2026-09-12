"use client";

import { cn } from "@/lib/utils";
import { useActivePage, useEditor } from "../state/editor-context";
import type { ShapeKind } from "../state/editor-store";
import { TOOLS } from "./tool-rail";

const ASSET_TINTS = ["#D9D3C5", "#C6CFEA", "#E2D4CC", "#CFDCD3", "#DCD6C8", "#E4D9E2"];

const tile = "rounded-[9px] border border-line hover:border-accent";

function TextPanel() {
  const addText = useEditor((s) => s.addText);
  return (
    <div className="flex flex-col gap-2">
      <button onClick={() => addText("heading")} className={cn(tile, "p-3 text-left font-serif text-[22px] leading-[1.1]")}>
        Add a heading
      </button>
      <button onClick={() => addText("subheading")} className={cn(tile, "p-[11px] text-left text-sm font-semibold")}>
        Add a subheading
      </button>
      <button onClick={() => addText("body")} className={cn(tile, "p-[11px] text-left text-xs")}>
        Add body text
      </button>
    </div>
  );
}

function ShapesPanel() {
  const addShape = useEditor((s) => s.addShape);
  const shapes: { kind: ShapeKind; label: string; glyph: string }[] = [
    { kind: "rect", label: "Add rectangle", glyph: "size-[26px] rounded-[2px]" },
    { kind: "ellipse", label: "Add ellipse", glyph: "size-[26px] rounded-full" },
    { kind: "line", label: "Add line", glyph: "h-0.5 w-7" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {shapes.map((s) => (
        <button key={s.kind} aria-label={s.label} onClick={() => addShape(s.kind)} className={cn(tile, "flex aspect-square items-center justify-center")}>
          <span className={cn("bg-ink", s.glyph)} />
        </button>
      ))}
    </div>
  );
}

function AssetGrid() {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {ASSET_TINTS.map((c) => (
        <div key={c} className="aspect-square rounded-[7px]" style={{ background: c }} />
      ))}
    </div>
  );
}

function UploadsPanel() {
  // Uploads to R2 arrive with the storage phase; the dropzone is visual for now.
  return (
    <div>
      <div className="rounded-[10px] border-[1.5px] border-dashed border-line-strong px-3 py-[18px] text-center text-[11.5px] text-muted hover:border-accent">
        Drop images here
        <br />
        <span className="text-muted-3">JPG · PNG · WebP · SVG</span>
      </div>
      <AssetGrid />
    </div>
  );
}

function LayersPanel() {
  const page = useActivePage();
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const layers = page.elements.toSorted((a, b) => b.zIndex - a.zIndex);

  if (layers.length === 0) return <p className="text-[11.5px] text-muted-2">This page is empty.</p>;
  return (
    <ul className="flex flex-col gap-1">
      {layers.map((el) => (
        <li key={el.id}>
          <button
            onClick={() => select(el.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs",
              el.id === selectedId ? "bg-surface-alt font-semibold" : "hover:bg-surface-sunken",
            )}
          >
            <span className="flex-1 truncate">{el.name}</span>
            <span className="font-mono text-[9.5px] text-muted-3">{el.type}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ToolPanel() {
  const tool = useEditor((s) => s.tool);
  const title = TOOLS.find((t) => t.value === tool)?.label;

  return (
    <aside className="w-[236px] shrink-0 overflow-auto border-r border-line bg-surface p-4 max-lg:hidden">
      <h2 className="mb-3 text-[12.5px] font-semibold">{title}</h2>
      {tool === "text" && <TextPanel />}
      {(tool === "shapes" || tool === "elements") && <ShapesPanel />}
      {tool === "uploads" && <UploadsPanel />}
      {tool === "photos" && (
        <>
          <p className="text-[11.5px] leading-normal text-muted-2">Stock photos are coming soon. Your uploads:</p>
          <AssetGrid />
        </>
      )}
      {tool === "layers" && <LayersPanel />}
    </aside>
  );
}
