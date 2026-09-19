import { Image as ImageIcon } from "lucide-react";
import type { Metadata } from "next";
import { AssetLibrary } from "@/components/assets/asset-library";
import { PlaceholderPage } from "@/components/dashboard/placeholder-page";
import { ButtonLink } from "@/components/ui/button";
import { getAssets, getEntitlements } from "@/lib/data";

export const metadata: Metadata = { title: "Assets" };

export default async function AssetsPage() {
  const [entitlements, assets] = await Promise.all([getEntitlements(), getAssets()]);

  if (!entitlements.canUseCanvasEditor && assets.length === 0) {
    return (
      <PlaceholderPage
        icon={ImageIcon}
        title="Your image library"
        body="Upload photos once and place them on any page in the canvas editor."
        action={<ButtonLink href="/dashboard/billing">See plans</ButtonLink>}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
      <div>
        <h1 className="mt-1 mb-1.5 font-serif text-[34px] leading-[1.1] tracking-[-0.6px]">Assets</h1>
        <p className="text-[13.5px] text-muted">Images you upload here or in the editor, ready to place on any page.</p>
      </div>
      <AssetLibrary assets={assets} canUpload={entitlements.canUseCanvasEditor} />
    </div>
  );
}
