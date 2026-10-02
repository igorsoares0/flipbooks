import { Image as ImageIcon } from "lucide-react";
import type { Metadata } from "next";
import { AssetLibrary } from "@/components/assets/asset-library";
import { PlaceholderPage } from "@/components/dashboard/placeholder-page";
import { ButtonLink } from "@/components/ui/button";
import { getAssets, getEntitlements } from "@/lib/data";
import { formatCount, formatMb } from "@/lib/format";

export const metadata: Metadata = { title: "Assets" };

export default async function AssetsPage() {
  const [entitlements, assets] = await Promise.all([getEntitlements(), getAssets()]);

  if (!entitlements.canUseCanvasEditor && assets.length === 0) {
    return (
      <PlaceholderPage
        icon={ImageIcon}
        title="Your image library"
        body="Upload photos once and place them on any page in the canvas editor."
        action={<ButtonLink href="/dashboard/billing" variant="primary">See plans</ButtonLink>}
      />
    );
  }

  const totalBytes = assets.reduce((sum, a) => sum + a.size, 0);

  return (
    <div className="flex max-w-[1240px] flex-col gap-7">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="font-serif text-[40px] leading-none tracking-[-1.2px] md:text-[52px] md:tracking-[-1.6px]">Assets</h1>
          <p className="text-[15px] text-ink-2">Images you upload here or in the editor, ready to place on any page.</p>
        </div>
        <p className="ml-auto pb-1 text-[13px] text-muted tabular-nums">
          {formatCount(assets.length)} {assets.length === 1 ? "image" : "images"} · {formatMb(totalBytes)}
        </p>
      </div>
      <AssetLibrary assets={assets} canUpload={entitlements.canUseCanvasEditor} />
    </div>
  );
}
