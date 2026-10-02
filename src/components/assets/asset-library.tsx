"use client";

import { Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Meter } from "@/components/ui/meter";
import { assetUsageAction, deleteAssetAction } from "@/lib/actions/assets";
import type { AssetRecord } from "@/lib/data/assets";
import { formatMb, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { IMAGE_ACCEPT, uploadImage } from "./upload-image";

type Upload = { name: string; progress: number; error: string | null };

function DeleteButton({ asset }: { asset: AssetRecord }) {
  const router = useRouter();
  // null: not asked yet; a number: how many flipbooks place the image.
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
      if (result.ok) router.refresh();
      else setError(result.error);
    });

  if (error) return <p className="text-[12px] text-danger">{error}</p>;
  if (usage === null) {
    return (
      <button
        onClick={ask}
        disabled={pending}
        aria-label={`Delete ${asset.filename}`}
        className="grid size-7 shrink-0 place-items-center rounded-full opacity-40 hover:bg-danger-bg hover:text-danger hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 className="size-4" strokeWidth={1.6} />
      </button>
    );
  }
  return (
    <div role="alertdialog" aria-label={`Delete ${asset.filename}?`} className="flex flex-col gap-2 text-[12px]">
      <span className="text-muted">
        {usage === 0 ? "Not used in any flipbook." : `Used in ${usage} flipbook${usage === 1 ? "" : "s"}; it will show as missing there.`}
      </span>
      <div className="flex gap-1.5">
        <Button variant="danger" size="xs" onClick={remove} disabled={pending}>
          {pending ? "Deleting…" : "Delete image"}
        </Button>
        <Button variant="outline" size="xs" onClick={() => setUsage(null)}>
          Keep
        </Button>
      </div>
    </div>
  );
}

export function AssetLibrary({ assets, canUpload }: { assets: AssetRecord[]; canUpload: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);

  const upload = async (files: File[]) => {
    for (const file of files) {
      const update = (patch: Partial<Upload>) =>
        setUploads((list) => list.map((u) => (u.name === file.name ? { ...u, ...patch } : u)));
      setUploads((list) => [...list.filter((u) => u.name !== file.name), { name: file.name, progress: 0, error: null }]);
      const result = await uploadImage(file, (progress) => update({ progress }));
      if (result.ok) setUploads((list) => list.filter((u) => u.name !== file.name));
      else update({ error: result.error });
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-7">
      {canUpload && (
        <>
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
              void upload([...e.dataTransfer.files]);
            }}
            className={cn(
              "flex min-h-[92px] items-center gap-4 border-[1.5px] border-dashed border-accent px-7 py-4 text-left max-sm:flex-wrap max-sm:px-4",
              dragging ? "bg-accent-tint" : "bg-accent-wash",
            )}
          >
            <Upload className="size-5 shrink-0 text-accent" strokeWidth={1.6} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 whitespace-normal">
              <span className="text-[15px] font-semibold">Drop images here</span>
              <span className="text-[13px] text-muted">JPG, PNG or WebP, up to 15 MB each</span>
            </span>
            <span className={buttonClasses({ variant: "primary", className: "px-5" })}>Choose files</span>
          </button>
          <input
            ref={input}
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            hidden
            aria-label="Upload images"
            onChange={(e) => {
              if (e.target.files?.length) void upload([...e.target.files]);
              e.target.value = "";
            }}
          />
        </>
      )}

      {uploads.length > 0 && (
        <ul className="flex flex-col gap-3" aria-label="Uploads in progress">
          {uploads.map((u) => (
            <li key={u.name} className="text-[13px]">
              <div className="flex justify-between gap-2">
                <span className="truncate">{u.name}</span>
                {u.error && (
                  <button className="text-muted hover:text-ink" onClick={() => setUploads((list) => list.filter((x) => x.name !== u.name))}>
                    Dismiss
                  </button>
                )}
              </div>
              {u.error ? (
                <p role="alert" className="text-danger">
                  {u.error}
                </p>
              ) : (
                <Meter value={u.progress} className="mt-1.5" label={`Uploading ${u.name}`} />
              )}
            </li>
          ))}
        </ul>
      )}

      {assets.length === 0 ? (
        <p className="border-t border-line py-10 text-[14px] text-muted">
          No images yet. Uploaded images appear here and in the editor&apos;s Uploads panel.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-label="Images">
          {assets.map((asset) => (
            <li key={asset.id} className="min-w-0">
              {/* Signed storage URL; no Next image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.url} alt={asset.filename} className="aspect-[4/3] w-full bg-canvas object-cover" loading="lazy" />
              <div className="flex items-start gap-2 pt-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold" title={asset.filename}>
                    {asset.filename}
                  </div>
                  <div className="mt-0.5 text-xs text-muted tabular-nums">
                    {asset.width}×{asset.height} · {formatMb(asset.size)} · {formatShortDate(asset.createdAt)}
                  </div>
                </div>
                <DeleteButton asset={asset} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
