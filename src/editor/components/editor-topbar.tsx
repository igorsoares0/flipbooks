"use client";

import { ChevronLeft, Redo2, Undo2 } from "lucide-react";
import Link from "next/link";
import { TypeBadge } from "@/components/ui/badges";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import type { FlipbookType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEditor } from "../state/editor-context";

const iconButton = buttonClasses({ variant: "secondary", size: "icon" });

export function EditorTopbar({ title, type, previewHref }: { title: string; type: FlipbookType; previewHref: string | null }) {
  const saveStatus = useEditor((s) => s.saveStatus);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3.5 border-b border-line bg-surface px-3.5">
      <Link href="/dashboard" aria-label="Back to dashboard" className={iconButton}>
        <ChevronLeft className="size-3.5" strokeWidth={1.8} />
      </Link>
      <div className="flex min-w-0 items-center gap-[9px]">
        <span className="truncate text-[13.5px] font-semibold">{title}</span>
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
      <div className="ml-auto flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-[11.5px] text-muted" aria-live="polite">
          <span className={cn("size-1.5 rounded-full", saveStatus === "saved" ? "bg-success" : "bg-warning")} />
          {saveStatus === "saved" ? "Saved" : "Saving…"}
        </span>
        {previewHref ? (
          <>
            <ButtonLink href={previewHref} variant="secondary" size="sm">
              Preview
            </ButtonLink>
            <ButtonLink href={previewHref} variant="accent" size="sm" className="px-4">
              Publish
            </ButtonLink>
          </>
        ) : (
          <>
            <span className={buttonClasses({ variant: "secondary", size: "sm" })} aria-disabled>
              Preview
            </span>
            <span className={buttonClasses({ variant: "accent", size: "sm", className: "px-4" })} aria-disabled>
              Publish
            </span>
          </>
        )}
      </div>
    </header>
  );
}
