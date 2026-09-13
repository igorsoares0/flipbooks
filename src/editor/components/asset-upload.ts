"use client";

import { useCallback } from "react";
import { uploadImage } from "@/components/assets/upload-image";
import { newId } from "@/lib/utils";
import { useEditorStore } from "../state/editor-context";
import type { AssetItem } from "../state/editor-store";

export { IMAGE_ACCEPT } from "@/components/assets/upload-image";

/** Uploads pictures to the library. Progress lives in the editor store so every panel can show it. */
export function useAssetUpload() {
  const store = useEditorStore();

  const uploadOne = useCallback(
    async (file: File): Promise<AssetItem | null> => {
      const id = newId("upload");
      const report = (progress: number, error: string | null = null) =>
        store.getState().setUpload({ id, filename: file.name, progress, error });

      report(0);
      const result = await uploadImage(file, (progress) => report(progress));
      if (!result.ok) {
        report(0, result.error);
        return null;
      }

      store.getState().removeUpload(id);
      const { asset } = result;
      const item: AssetItem = { id: asset.id, key: asset.key, url: asset.url, filename: asset.filename, width: asset.width, height: asset.height };
      store.getState().addAsset(item);
      return item;
    },
    [store],
  );

  /** Uploads the files one after another; `place` also adds each finished picture to the page. */
  const upload = useCallback(
    async (files: File[], { place = false }: { place?: boolean } = {}) => {
      for (const file of files) {
        const asset = await uploadOne(file);
        if (asset && place) store.getState().addImage(asset);
      }
    },
    [store, uploadOne],
  );

  return { upload };
}
