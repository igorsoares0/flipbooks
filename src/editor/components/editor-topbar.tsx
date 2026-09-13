"use client";

import { ChevronLeft, Minus, Plus, Redo2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TypeBadge } from "@/components/ui/badges";
import { Button, ButtonLink, buttonClasses } from "@/components/ui/button";
import { publishFlipbookAction } from "@/lib/actions/flipbooks";
import type { FlipbookType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEditor } from "../state/editor-context";
import { ZOOM_STEPS } from "../state/editor-store";

const iconButton = buttonClasses({ variant: "secondary", size: "icon" });

function SaveStatus() {
  const saveStatus = useEditor((s) => s.saveStatus);
  const saveError = useEditor((s) => s.saveError);
  const retry = useEditor((s) => s.retrySave);

  if (saveStatus === "error") {
    return (
      <span className="flex max-w-[260px] items-center gap-1.5 text-[11.5px] text-danger" role="alert" title={saveError ?? undefined}>
        <span className="size-1.5 shrink-0 rounded-full bg-danger" />
        <span className="truncate">Couldn&apos;t save</span>
        <button onClick={retry} className="font-semibold underline underline-offset-2">
          Retry
        </button>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[11.5px] text-muted" aria-live="polite">
      <span className={cn("size-1.5 rounded-full", saveStatus === "saved" ? "bg-success" : "bg-warning")} />
      {saveStatus === "saved" ? "Saved" : "Saving…"}
    </span>
  );
}

function ZoomControls() {
  const zoom = useEditor((s) => s.zoom);
  const fitScale = useEditor((s) => s.fitScale);
  const zoomBy = useEditor((s) => s.zoomBy);
  const setZoom = useEditor((s) => s.setZoom);
  const scale = zoom === "fit" ? fitScale : zoom;
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center gap-0.5 max-md:hidden" role="group" aria-label="Zoom">
      <button className={iconButton} aria-label="Zoom out" title="Zoom out (Ctrl+-)" onClick={() => zoomBy(-1)}>
        <Minus className="size-3.5" strokeWidth={1.6} />
      </button>
      <button
        className="w-[52px] rounded-md py-[5px] text-center font-mono text-[11.5px] font-medium text-muted hover:bg-surface-sunken"
        aria-label="Zoom level"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={(e) => !e.currentTarget.parentElement?.contains(e.relatedTarget) && setOpen(false)}
      >
        {Math.round(scale * 100)}%
      </button>
      <button className={iconButton} aria-label="Zoom in" title="Zoom in (Ctrl++)" onClick={() => zoomBy(1)}>
        <Plus className="size-3.5" strokeWidth={1.6} />
      </button>
      {open && (
        <ul role="listbox" aria-label="Zoom presets" className="absolute top-full left-1/2 z-20 mt-1.5 w-[132px] -translate-x-1/2 rounded-[10px] border border-line bg-surface p-1 shadow-canvas">
          {[["fit", "Fit to screen"] as const, ...ZOOM_STEPS.map((z) => [z, `${z * 100}%`] as const)].map(([value, label]) => (
            <li key={label}>
              <button
                role="option"
                aria-selected={zoom === value}
                onClick={() => {
                  setZoom(value);
                  setOpen(false);
                }}
                className={cn("w-full rounded-md px-2.5 py-1.5 text-left text-[12.5px] hover:bg-surface-sunken", zoom === value && "font-semibold")}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EditorTopbar({
  flipbookId,
  title,
  type,
  slug,
  published,
}: {
  flipbookId: string;
  title: string;
  type: FlipbookType;
  slug: string;
  published: boolean;
}) {
  const saved = useEditor((s) => s.saveStatus === "saved");
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const publish = async () => {
    setPublishing(true);
    setPublishError(null);
    const result = await publishFlipbookAction(flipbookId);
    // On success the action redirects to the public page.
    if (result && !result.ok) setPublishError(result.error);
    setPublishing(false);
  };

  return (
    <header className="relative flex h-[52px] shrink-0 items-center gap-3.5 border-b border-line bg-surface px-3.5">
      <Link href="/dashboard" aria-label="Back to dashboard" className={iconButton}>
        <ChevronLeft className="size-3.5" strokeWidth={1.8} />
      </Link>
      <div className="flex min-w-0 items-center gap-[9px]">
        <Link href={`/dashboard/flipbooks/${flipbookId}/settings`} className="truncate text-[13.5px] font-semibold text-ink hover:text-ink hover:underline">
          {title}
        </Link>
        <TypeBadge className="py-0.5">{type}</TypeBadge>
      </div>
      {/* Menus are not designed yet; shown for layout parity with the handoff. */}
      <div className="ml-2.5 flex gap-0.5 max-lg:hidden">
        {["File", "Edit", "View"].map((menu) => (
          <span key={menu} className="rounded-md px-[9px] py-[5px] text-[12.5px] text-muted">
            {menu}
          </span>
        ))}
      </div>
      <div className="mx-1 h-5 w-px bg-line" />
      <button className={iconButton} aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
        <Undo2 className="size-3.5" strokeWidth={1.6} />
      </button>
      <button className={iconButton} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}>
        <Redo2 className="size-3.5" strokeWidth={1.6} />
      </button>
      <div className="mx-1 h-5 w-px bg-line max-md:hidden" />
      <ZoomControls />
      <div className="ml-auto flex items-center gap-3">
        <SaveStatus />
        {published ? (
          // Autosave writes straight to the live book, so there is nothing extra to publish.
          <ButtonLink href={`/f/${slug}`} variant="accent" size="sm" className="px-4">
            View live
          </ButtonLink>
        ) : (
          <>
            <ButtonLink href={`/f/${slug}`} variant="secondary" size="sm">
              Preview
            </ButtonLink>
            <Button
              variant="accent"
              size="sm"
              className="px-4"
              onClick={publish}
              disabled={publishing || !saved}
              title={saved ? undefined : "Waiting for your changes to save"}
            >
              {publishing ? "Publishing…" : "Publish"}
            </Button>
          </>
        )}
      </div>
      {publishError && (
        <p role="alert" className="absolute top-full right-3.5 z-10 mt-2 max-w-[320px] rounded-lg border border-danger-line bg-surface px-3 py-2 text-[12px] text-danger shadow-canvas">
          {publishError}
        </p>
      )}
    </header>
  );
}
