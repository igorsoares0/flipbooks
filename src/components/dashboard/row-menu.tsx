"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { buttonClasses } from "@/components/ui/button";
import { deleteFlipbookAction, duplicateFlipbookAction } from "@/lib/actions/flipbooks";
import { cn } from "@/lib/utils";

const item = "flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[12.5px] text-ink hover:bg-surface-sunken hover:text-ink";

/** The row's "···" menu. Not in the design handoff; styled with the card tokens. */
export function RowMenu({ id, title, published }: { id: string; title: string; published: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    setConfirming(false);
    setError(null);
  };

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) close();
      else setError(result.error ?? "Something went wrong.");
    });

  return (
    <div className="relative">
      <button
        className={buttonClasses({ variant: "secondary", className: "h-7 w-[30px] rounded-[7px] p-0" })}
        aria-label={`More actions for ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Ellipsis className="size-3.5" strokeWidth={2} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={close} aria-hidden />
          <div role="menu" aria-label={`Actions for ${title}`} className="absolute top-full right-0 z-40 mt-1.5 w-48 rounded-xl border border-line bg-surface p-1.5 shadow-canvas">
            <Link role="menuitem" href={`/dashboard/flipbooks/${id}/settings`} className={item} onClick={close}>
              Settings
            </Link>
            {published && (
              <Link role="menuitem" href={`/dashboard/flipbooks/${id}/analytics`} className={item} onClick={close}>
                Analytics
              </Link>
            )}
            <button role="menuitem" className={item} disabled={pending} onClick={() => run(() => duplicateFlipbookAction(id))}>
              {pending && !confirming ? "Duplicating…" : "Duplicate"}
            </button>
            <div className="my-1 h-px bg-line-soft" />
            {confirming ? (
              <button
                role="menuitem"
                className={cn(item, "font-semibold text-danger hover:bg-danger-tint hover:text-danger")}
                disabled={pending}
                onClick={() => run(() => deleteFlipbookAction(id))}
              >
                {pending ? "Deleting…" : "Confirm delete"}
              </button>
            ) : (
              <button role="menuitem" className={cn(item, "text-danger hover:bg-danger-tint hover:text-danger")} onClick={() => setConfirming(true)}>
                Delete
              </button>
            )}
            {error && <p className="px-2.5 pt-1 pb-0.5 text-[11.5px] text-danger">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
