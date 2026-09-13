"use client";

import { Eye, EyeOff, Lock, LockOpen, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Meter } from "@/components/ui/meter";
import { cn } from "@/lib/utils";
import { useActivePage, useEditor } from "../state/editor-context";
import type { ShapeKind } from "../state/editor-store";
import { IMAGE_ACCEPT, useAssetUpload } from "./asset-upload";
import { TOOLS } from "./tool-rail";

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
      <p className="mt-1 text-[11px] leading-normal text-muted-2">Double-click a text on the page to edit it. Ctrl+I makes a word italic.</p>
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

/** The user's library; clicking a picture places it on the page. */
function AssetGrid() {
  const assets = useEditor((s) => s.assets);
  const addImage = useEditor((s) => s.addImage);
  if (assets.length === 0) return <p className="mt-3 text-[11.5px] text-muted-2">No images yet.</p>;
  return (
    <ul className="mt-3 grid grid-cols-2 gap-2" aria-label="Your images">
      {assets.map((asset) => (
        <li key={asset.key}>
          <button
            onClick={() => addImage(asset)}
            aria-label={`Add ${asset.filename}`}
            title={asset.filename}
            className="block aspect-square w-full overflow-hidden rounded-[7px] border border-line bg-surface-alt hover:border-accent"
          >
            {/* Signed storage URL, like page images. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.url} alt="" className="size-full object-cover" loading="lazy" draggable={false} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function UploadsPanel() {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const uploads = useEditor((s) => s.uploads);
  const removeUpload = useEditor((s) => s.removeUpload);
  const { upload } = useAssetUpload();

  const pick = (files: FileList | null) => {
    if (files?.length) void upload([...files]);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed px-3 py-[18px] text-center text-[11.5px] text-muted hover:border-accent",
          dragging ? "border-accent bg-accent-soft" : "border-line-strong",
        )}
      >
        <Upload className="size-4" strokeWidth={1.5} />
        Upload or drop images
        <span className="text-muted-3">JPG · PNG · WebP, up to 15 MB</span>
      </button>
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        hidden
        aria-label="Upload images"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />

      {uploads.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2" aria-label="Uploads in progress">
          {uploads.map((item) => (
            <li key={item.id} className="text-[11px]">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{item.filename}</span>
                {item.error && (
                  <button onClick={() => removeUpload(item.id)} className="text-muted-2 hover:text-ink">
                    Dismiss
                  </button>
                )}
              </div>
              {item.error ? (
                <p role="alert" className="mt-0.5 text-danger">
                  {item.error}
                </p>
              ) : (
                <Meter value={item.progress} className="mt-1" label={`Uploading ${item.filename}`} />
              )}
            </li>
          ))}
        </ul>
      )}
      <AssetGrid />
    </div>
  );
}

function LayersPanel() {
  const page = useActivePage();
  const selectedIds = useEditor((s) => s.selectedIds);
  const select = useEditor((s) => s.select);
  const toggleLock = useEditor((s) => s.toggleLock);
  const toggleVisible = useEditor((s) => s.toggleVisible);
  const layers = page.elements.toSorted((a, b) => b.zIndex - a.zIndex);

  if (layers.length === 0) return <p className="text-[11.5px] text-muted-2">This page is empty.</p>;
  return (
    <ul className="flex flex-col gap-1" aria-label="Layers">
      {layers.map((el) => {
        const selected = selectedIds.includes(el.id);
        return (
          <li key={el.id} className={cn("group flex items-center rounded-lg", selected ? "bg-surface-alt" : "hover:bg-surface-sunken")}>
            <button
              onClick={(e) => select(el.id, { additive: e.shiftKey || e.metaKey || e.ctrlKey })}
              aria-pressed={selected}
              className={cn("flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-xs", selected && "font-semibold", !el.visible && "text-muted-3")}
            >
              <span className="flex-1 truncate">{el.name}</span>
              <span className="font-mono text-[9.5px] text-muted-3">{el.type}</span>
            </button>
            <button
              onClick={() => toggleLock(el.id)}
              aria-label={el.locked ? `Unlock ${el.name}` : `Lock ${el.name}`}
              aria-pressed={el.locked}
              className={cn("p-1 text-muted-2 hover:text-ink", !el.locked && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100")}
            >
              {el.locked ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
            </button>
            <button
              onClick={() => toggleVisible(el.id)}
              aria-label={el.visible ? `Hide ${el.name}` : `Show ${el.name}`}
              aria-pressed={!el.visible}
              className={cn("p-1 pr-2 text-muted-2 hover:text-ink", el.visible && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100")}
            >
              {el.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
            </button>
          </li>
        );
      })}
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
