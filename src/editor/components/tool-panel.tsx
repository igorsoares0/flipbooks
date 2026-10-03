"use client";

import { Eye, EyeOff, Image as ImageIcon, Lock, LockOpen, Square, Trash2, Type, Upload, type LucideIcon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/meter";
import { assetUsageAction, deleteAssetAction } from "@/lib/actions/assets";
import type { ElementType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useActivePage, useEditor } from "../state/editor-context";
import type { AssetItem, ShapeKind } from "../state/editor-store";
import { IMAGE_ACCEPT, useAssetUpload } from "./asset-upload";
import { TOOLS } from "./tool-rail";

const tile = "border border-line-2 hover:border-accent";

function TextPanel() {
  const addText = useEditor((s) => s.addText);
  return (
    <div className="flex flex-col gap-3">
      <button onClick={() => addText("heading")} className={cn(tile, "px-4 py-3.5 text-left font-serif text-[26px] leading-none tracking-[-0.6px]")}>
        Add a heading
      </button>
      <button onClick={() => addText("subheading")} className={cn(tile, "px-4 py-3 text-left text-base font-semibold")}>
        Add a subheading
      </button>
      <button onClick={() => addText("body")} className={cn(tile, "px-4 py-3 text-left text-[13px] text-ink-2")}>
        Add body text
      </button>
      <p className="text-[12.5px] leading-normal whitespace-normal text-muted">Double-click a text on the page to edit it. Ctrl+I makes a word italic.</p>
    </div>
  );
}

function ShapesPanel() {
  const addShape = useEditor((s) => s.addShape);
  const shapes: { kind: ShapeKind; label: string; glyph: string }[] = [
    { kind: "rect", label: "Add rectangle", glyph: "size-full" },
    { kind: "ellipse", label: "Add ellipse", glyph: "size-full rounded-full" },
    { kind: "line", label: "Add line", glyph: "h-0.5 w-full" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {shapes.map((s) => (
        <button key={s.kind} aria-label={s.label} onClick={() => addShape(s.kind)} className="flex aspect-square items-center justify-center border border-line p-4 hover:border-accent">
          <span className={cn("bg-ink", s.glyph)} />
        </button>
      ))}
    </div>
  );
}

/** One library picture. Deleting first says how many saved flipbooks place it. */
function AssetTile({ asset, deletable }: { asset: AssetItem; deletable: boolean }) {
  const addImage = useEditor((s) => s.addImage);
  const removeAsset = useEditor((s) => s.removeAsset);
  // null: not asked yet; a number: how many flipbooks place the picture.
  const [usage, setUsage] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ask = () =>
    startTransition(async () => {
      const result = await assetUsageAction(asset.id);
      if (result.ok) setUsage(result.flipbooks);
      else setError(result.error);
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteAssetAction(asset.id);
      if (result.ok) removeAsset(asset.key);
      else setError(result.error);
    });

  // Signed storage URL, like page images.
  // eslint-disable-next-line @next/next/no-img-element
  const thumbnail = (className: string) => <img src={asset.url} alt="" className={className} loading="lazy" draggable={false} />;

  if (usage !== null || error) {
    return (
      <li className="col-span-2 flex gap-2.5 border border-line-2 p-2">
        {thumbnail("size-14 shrink-0 bg-canvas object-cover")}
        {error ? (
          <div className="flex min-w-0 flex-col items-start gap-1.5 text-[12px]">
            <p role="alert" className="text-danger">
              {error}
            </p>
            <button onClick={() => setError(null)} className="text-muted hover:text-ink">
              Dismiss
            </button>
          </div>
        ) : (
          <div role="alertdialog" aria-label={`Delete ${asset.filename}?`} className="flex min-w-0 flex-col gap-2 text-[12px]">
            <span className="whitespace-normal text-muted">
              {usage === 0 ? "Not used in any flipbook." : `Used in ${usage} flipbook${usage === 1 ? "" : "s"}; it will show as missing there.`}
            </span>
            <div className="flex gap-1.5">
              <Button variant="danger" size="xs" onClick={remove} disabled={pending}>
                {pending ? "Deleting…" : "Delete image"}
              </Button>
              <Button variant="outline" size="xs" onClick={() => setUsage(null)} disabled={pending}>
                Keep
              </Button>
            </div>
          </div>
        )}
      </li>
    );
  }

  return (
    <li className="group relative">
      <button
        onClick={() => addImage(asset)}
        aria-label={`Add ${asset.filename}`}
        title={asset.filename}
        className="block aspect-square w-full overflow-hidden bg-canvas hover:shadow-[0_0_0_2px_var(--color-accent)]"
      >
        {thumbnail("size-full object-cover")}
      </button>
      {deletable && (
        <button
          onClick={ask}
          disabled={pending}
          aria-label={`Delete ${asset.filename}`}
          className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-surface text-ink opacity-0 shadow-sm group-hover:opacity-100 hover:bg-danger-bg hover:text-danger focus-visible:opacity-100"
        >
          <Trash2 className="size-3.5" strokeWidth={1.6} />
        </button>
      )}
    </li>
  );
}

/** The user's library; clicking a picture places it on the page. */
function AssetGrid({ deletable = false }: { deletable?: boolean }) {
  const assets = useEditor((s) => s.assets);
  if (assets.length === 0) return <p className="text-[13px] text-muted">No images yet.</p>;
  return (
    <ul className="grid grid-cols-2 gap-2" aria-label="Your images">
      {assets.map((asset) => (
        <AssetTile key={asset.key} asset={asset} deletable={deletable} />
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
    <div className="flex flex-col gap-3">
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
          "flex w-full flex-col items-center gap-1.5 border-[1.5px] border-dashed border-accent px-3 py-5 text-center text-[13px] font-semibold text-accent",
          dragging ? "bg-accent-tint" : "bg-accent-wash",
        )}
      >
        <Upload className="size-[18px]" strokeWidth={1.6} />
        Upload or drop images
        <span className="text-[12px] font-normal text-muted">JPG · PNG · WebP, up to 15 MB</span>
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
        <ul className="flex flex-col gap-2.5" aria-label="Uploads in progress">
          {uploads.map((item) => (
            <li key={item.id} className="text-[12.5px]">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{item.filename}</span>
                {item.error && (
                  <button onClick={() => removeUpload(item.id)} className="text-muted hover:text-ink">
                    Dismiss
                  </button>
                )}
              </div>
              {item.error ? (
                <p role="alert" className="mt-0.5 text-danger">
                  {item.error}
                </p>
              ) : (
                <Meter value={item.progress} className="mt-1.5" label={`Uploading ${item.filename}`} />
              )}
            </li>
          ))}
        </ul>
      )}
      <AssetGrid deletable />
    </div>
  );
}

const LAYER_ICONS: Record<ElementType, LucideIcon> = { TEXT: Type, IMAGE: ImageIcon, SHAPE: Square };

function LayerIcon({ type }: { type: ElementType }) {
  const Icon = LAYER_ICONS[type];
  return <Icon className="size-4 shrink-0 opacity-60" strokeWidth={1.6} />;
}

function LayersPanel() {
  const page = useActivePage();
  const selectedIds = useEditor((s) => s.selectedIds);
  const select = useEditor((s) => s.select);
  const toggleLock = useEditor((s) => s.toggleLock);
  const toggleVisible = useEditor((s) => s.toggleVisible);
  const layers = page.elements.toSorted((a, b) => b.zIndex - a.zIndex);

  if (layers.length === 0) return <p className="text-[13px] text-muted">This page is empty.</p>;
  return (
    <>
    <p className="-mt-1 text-[12.5px] text-muted">Page {page.pageNumber} · top layer first</p>
    <ul className="-mx-5 flex flex-col" aria-label="Layers">
      {layers.map((el) => {
        const selected = selectedIds.includes(el.id);
        return (
          <li
            key={el.id}
            className={cn("group flex h-11 items-center border-b border-line px-5", selected ? "bg-accent-tint shadow-[inset_3px_0_0_var(--color-accent)]" : "hover:bg-hover")}
          >
            <button
              onClick={(e) => select(el.id, { additive: e.shiftKey || e.metaKey || e.ctrlKey })}
              aria-pressed={selected}
              className={cn("flex h-full min-w-0 flex-1 items-center gap-2.5 text-left text-[13.5px]", selected && "font-semibold text-accent", !el.visible && "text-faint")}
            >
              <LayerIcon type={el.type} />
              <span className="flex-1 truncate">{el.name}</span>
            </button>
            <button
              onClick={() => toggleLock(el.id)}
              aria-label={el.locked ? `Unlock ${el.name}` : `Lock ${el.name}`}
              aria-pressed={el.locked}
              className={cn("p-1.5 text-muted hover:text-ink", !el.locked && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100")}
            >
              {el.locked ? <Lock className="size-3.5" strokeWidth={1.6} /> : <LockOpen className="size-3.5" strokeWidth={1.6} />}
            </button>
            <button
              onClick={() => toggleVisible(el.id)}
              aria-label={el.visible ? `Hide ${el.name}` : `Show ${el.name}`}
              aria-pressed={!el.visible}
              className={cn("p-1.5 text-muted hover:text-ink", el.visible && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100")}
            >
              {el.visible ? <Eye className="size-3.5" strokeWidth={1.6} /> : <EyeOff className="size-3.5" strokeWidth={1.6} />}
            </button>
          </li>
        );
      })}
    </ul>
    </>
  );
}

export function ToolPanel() {
  const tool = useEditor((s) => s.tool);
  const title = TOOLS.find((t) => t.value === tool)?.label;

  return (
    <aside className="flex w-[260px] shrink-0 flex-col gap-3 overflow-auto border-r border-line bg-surface px-5 pt-5 pb-5 max-lg:hidden">
      <h2 className="font-serif text-[24px] leading-tight tracking-[-0.5px]">{title}</h2>
      {tool === "text" && <TextPanel />}
      {(tool === "shapes" || tool === "elements") && <ShapesPanel />}
      {tool === "uploads" && <UploadsPanel />}
      {tool === "photos" && (
        <>
          <p className="text-[13px] leading-normal text-muted">Stock photos are coming soon. Your uploads:</p>
          <AssetGrid />
        </>
      )}
      {tool === "layers" && <LayersPanel />}
    </aside>
  );
}
