"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { buttonClasses } from "@/components/ui/button";
import { deleteFlipbookAction, duplicateFlipbookAction } from "@/lib/actions/flipbooks";
import { retryProcessingAction } from "@/lib/actions/uploads";
import { cn } from "@/lib/utils";

const item = "flex h-9 w-full items-center rounded-md px-2.5 text-left text-[13.5px] text-ink hover:bg-hover hover:text-ink";

/** The row's "···" menu, styled like the editor's page menu. */
export function RowMenu({ id, title, published, canRetry = false }: { id: string; title: string; published: boolean; canRetry?: boolean }) {
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
        className={buttonClasses({ variant: "secondary", size: "icon", className: "size-[30px]" })}
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
          <div role="menu" aria-label={`Actions for ${title}`} className="absolute top-full right-0 z-40 mt-1.5 w-[200px] bg-surface p-1 shadow-menu">
            <Link role="menuitem" href={`/dashboard/flipbooks/${id}/settings`} className={item} onClick={close}>
              Settings
            </Link>
            {published && (
              <Link role="menuitem" href={`/dashboard/flipbooks/${id}/analytics`} className={item} onClick={close}>
                Analytics
              </Link>
            )}
            {canRetry && (
              <button role="menuitem" className={item} disabled={pending} onClick={() => run(() => retryProcessingAction(id))}>
                Retry processing
              </button>
            )}
            <button role="menuitem" className={item} disabled={pending} onClick={() => run(() => duplicateFlipbookAction(id))}>
              {pending && !confirming ? "Duplicating…" : "Duplicate"}
            </button>
            <div className="my-1 h-px bg-line" />
            {confirming ? (
              <button
                role="menuitem"
                className={cn(item, "font-semibold text-danger hover:bg-danger-bg hover:text-danger")}
                disabled={pending}
                onClick={() => run(() => deleteFlipbookAction(id))}
              >
                {pending ? "Deleting…" : "Confirm delete"}
              </button>
            ) : (
              <button role="menuitem" className={cn(item, "text-danger hover:bg-danger-bg hover:text-danger")} onClick={() => setConfirming(true)}>
                Delete
              </button>
            )}
            {error && <p className="px-2.5 pt-1 pb-0.5 text-[12px] text-danger">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
