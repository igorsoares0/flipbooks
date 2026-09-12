import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FlipbookSettings, type SettingsTab } from "@/components/flipbook/flipbook-settings";
import { getBilling, getFlipbook, getFlipbookPages } from "@/lib/data";
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

  const [pages, billing] = await Promise.all([getFlipbookPages(id), getBilling()]);
  // The preview shows the same spread as the design: pages 4–5, or the first spread of a short book.
  const previewPages = pages.length >= 5 ? pages.slice(3, 5) : pages.slice(0, 2);

  return (
    <FlipbookSettings
      flipbook={{
        id: flipbook.id,
        title: flipbook.title,
        slug: flipbook.slug,
        description: flipbook.description,
        visibility: flipbook.visibility,
        settings: flipbook.settings,
      }}
      previewPages={previewPages}
      pageCount={flipbook.pageCount}
      publicUrlBase={siteUrl.origin}
      embedUrl={embedFlipbookUrl(flipbook.id)}
      canRemoveBranding={billing.entitlements.canRemoveBranding}
      initialTab={TABS.find((t) => t === tab) ?? "general"}
    />
  );
}
