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

const iconButton = buttonClasses({ variant: "secondary", size: "icon", className: "disabled:opacity-30" });

/** A dot and a word; a failed save also raises the banner under the top bar (see editor.tsx). */
function SaveStatus() {
  const saveStatus = useEditor((s) => s.saveStatus);
  if (saveStatus === "error") {
    return (
      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-danger" role="status">
        <span className="size-1.5 shrink-0 rounded-full bg-danger" />
        Not saved
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[12.5px] text-muted" aria-live="polite">
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
    <div className="relative flex items-center gap-1 max-md:hidden" role="group" aria-label="Zoom">
      <button className={iconButton} aria-label="Zoom out" title="Zoom out (Ctrl+-)" onClick={() => zoomBy(-1)}>
        <Minus className="size-3.5" strokeWidth={1.6} />
      </button>
      <button
        className="h-[34px] w-[54px] rounded-full text-center text-[13px] text-muted tabular-nums hover:bg-hover"
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
        <ul role="listbox" aria-label="Zoom presets" className="absolute top-full left-1/2 z-20 mt-1.5 w-[140px] -translate-x-1/2 bg-surface p-1 shadow-menu">
          {[["fit", "Fit to screen"] as const, ...ZOOM_STEPS.map((z) => [z, `${z * 100}%`] as const)].map(([value, label]) => (
            <li key={label}>
              <button
                role="option"
                aria-selected={zoom === value}
                onClick={() => {
                  setZoom(value);
                  setOpen(false);
                }}
                className={cn("flex h-9 w-full items-center rounded-md px-2.5 text-left text-[13.5px] hover:bg-hover", zoom === value && "font-semibold text-accent")}
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
    <header className="relative flex h-[60px] shrink-0 items-center gap-4 border-b border-ink bg-surface px-5 max-md:gap-2.5 max-md:px-3">
      <Link href="/dashboard" aria-label="Back to dashboard" className={iconButton}>
        <ChevronLeft className="size-4" strokeWidth={1.6} />
      </Link>
      <div className="flex min-w-0 items-center gap-2.5">
        <Link
          href={`/dashboard/flipbooks/${flipbookId}/settings`}
          className="truncate font-serif text-[24px] leading-tight tracking-[-0.6px] text-ink hover:text-accent max-md:text-[19px]"
        >
          {title}
        </Link>
        <TypeBadge>{type === "CANVAS" ? "Canvas" : "PDF"}</TypeBadge>
      </div>
      {/* Menus are placeholders from the handoff; nothing behind them yet. */}
      <div className="ml-4 flex gap-[18px] text-[13.5px] text-ink-2 max-lg:hidden" aria-hidden>
        <span>File</span>
        <span>Edit</span>
        <span>View</span>
      </div>
      <div className="h-5 w-px bg-line max-md:hidden" />
      <div className="flex gap-1.5">
        <button className={iconButton} aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
          <Undo2 className="size-4" strokeWidth={1.6} />
        </button>
        <button className={iconButton} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}>
          <Redo2 className="size-4" strokeWidth={1.6} />
        </button>
      </div>
      <ZoomControls />
      <div className="ml-auto flex items-center gap-3">
        <SaveStatus />
        {published ? (
          // Autosave writes straight to the live book, so there is nothing extra to publish.
          <ButtonLink href={`/f/${slug}`} variant="primary" size="sm" className="px-[18px]">
            View live
          </ButtonLink>
        ) : (
          <>
            <ButtonLink href={`/f/${slug}`} variant="outline" size="sm" className="max-sm:hidden">
              Preview
            </ButtonLink>
            <Button
              variant="primary"
              size="sm"
              className="px-[18px]"
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
        <p role="alert" className="absolute top-full right-5 z-10 mt-2 max-w-[320px] bg-surface px-3.5 py-2.5 text-[13px] text-danger shadow-menu">
          {publishError}
        </p>
      )}
    </header>
  );
}
