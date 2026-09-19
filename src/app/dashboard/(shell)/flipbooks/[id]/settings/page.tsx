import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FlipbookSettings, type SettingsTab } from "@/components/flipbook/flipbook-settings";
import { getEntitlements, getFlipbook, getFlipbookPages } from "@/lib/data";
import { effectiveSettings } from "@/lib/entitlements/policy";
import { embedFlipbookUrl, siteUrl } from "@/lib/site";

const TABS: SettingsTab[] = ["general", "branding", "share"];

export async function generateMetadata({ params }: PageProps<"/dashboard/flipbooks/[id]/settings">): Promise<Metadata> {
  const flipbook = await getFlipbook((await params).id);
  return { title: flipbook ? `Settings · ${flipbook.title}` : "Settings" };
}

export default async function FlipbookSettingsPage({ params, searchParams }: PageProps<"/dashboard/flipbooks/[id]/settings">) {
  const { id } = await params;
  const { tab } = await searchParams;
  const flipbook = await getFlipbook(id);
  if (!flipbook) notFound();

  // The preview shows the same spread as the design: pages 4–5, or the first spread of a short book.
  const pageNumbers = flipbook.pageCount >= 5 ? [4, 5] : [1, 2];
  const [previewPages, entitlements] = await Promise.all([getFlipbookPages(id, { pageNumbers }), getEntitlements()]);

  return (
    <FlipbookSettings
      flipbook={{
        id: flipbook.id,
        title: flipbook.title,
        slug: flipbook.slug,
        description: flipbook.description,
        visibility: flipbook.visibility,
        status: flipbook.status,
        type: flipbook.type,
        error: flipbook.error,
        // Paid-only choices saved before a downgrade show as they currently apply.
        settings: effectiveSettings(flipbook.settings, entitlements),
      }}
      previewPages={previewPages}
      pageCount={flipbook.pageCount}
      publicUrlBase={siteUrl.origin}
      embedUrl={embedFlipbookUrl(flipbook.id)}
      canRemoveBranding={entitlements.canRemoveBranding}
      canUseCustomSlug={entitlements.canUseCustomSlug}
      canOfferDownload={entitlements.canOfferDownload}
      initialTab={TABS.find((t) => t === tab) ?? "general"}
    />
  );
}
