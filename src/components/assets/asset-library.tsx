"use client";

import { Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
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

  if (error) return <p className="text-[11px] text-danger">{error}</p>;
  if (usage === null) {
    return (
      <button
        onClick={ask}
        disabled={pending}
        aria-label={`Delete ${asset.filename}`}
        className="grid size-7 place-items-center rounded-md text-muted-2 hover:bg-danger-tint hover:text-danger"
      >
        <Trash2 className="size-3.5" strokeWidth={1.75} />
      </button>
    );
  }
  return (
    <div role="alertdialog" aria-label={`Delete ${asset.filename}?`} className="flex flex-col gap-1.5 text-[11px]">
      <span className="text-muted">
        {usage === 0 ? "Not used in any flipbook." : `Used in ${usage} flipbook${usage === 1 ? "" : "s"}; it will show as missing there.`}
      </span>
      <div className="flex gap-1.5">
        <Button variant="danger" size="sm" className="h-7 px-2.5 text-[11px]" onClick={remove} disabled={pending}>
          {pending ? "Deleting…" : "Delete image"}
        </Button>
        <Button variant="secondary" size="sm" className="h-7 px-2.5 text-[11px]" onClick={() => setUsage(null)}>
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
    <div className="flex flex-col gap-4">
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
              "flex flex-col items-center gap-1.5 rounded-2xl border-[1.5px] border-dashed bg-surface px-6 py-8 text-center text-[13px] text-muted hover:border-accent",
              dragging ? "border-accent bg-accent-soft" : "border-line-strong",
            )}
          >
            <Upload className="size-5" strokeWidth={1.5} />
            <span className="font-medium text-ink">Upload images</span>
            <span className="text-[11.5px] text-muted-3">Drop files here or click to choose · JPG, PNG, WebP up to 15 MB</span>
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
        <ul className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3" aria-label="Uploads in progress">
          {uploads.map((u) => (
            <li key={u.name} className="text-[12px]">
              <div className="flex justify-between gap-2">
                <span className="truncate">{u.name}</span>
                {u.error && (
                  <button className="text-muted-2 hover:text-ink" onClick={() => setUploads((list) => list.filter((x) => x.name !== u.name))}>
                    Dismiss
                  </button>
                )}
              </div>
              {u.error ? (
                <p role="alert" className="text-danger">
                  {u.error}
                </p>
              ) : (
                <Meter value={u.progress} className="mt-1" label={`Uploading ${u.name}`} />
              )}
            </li>
          ))}
        </ul>
      )}

      {assets.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface px-6 py-10 text-center text-[12.5px] text-muted">
          No images yet. Uploaded images appear here and in the editor&apos;s Uploads panel.
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3.5" aria-label="Images">
          {assets.map((asset) => (
            <li key={asset.id} className="overflow-hidden rounded-xl border border-line bg-surface">
              {/* Signed storage URL; no Next image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.url} alt={asset.filename} className="aspect-[4/3] w-full bg-surface-alt object-cover" loading="lazy" />
              <div className="flex items-start gap-2 p-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium" title={asset.filename}>
                    {asset.filename}
                  </div>
                  <div className="mt-0.5 font-mono text-[10.5px] text-muted-2">
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
