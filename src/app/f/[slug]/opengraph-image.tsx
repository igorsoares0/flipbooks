import { getShareTarget } from "@/lib/data/flipbooks";
import { flipbookCard, OG_SIZE, siteCard } from "@/lib/og/card";
import { renderOgCard } from "@/lib/og/image";
import { siteHost } from "@/lib/site";

// The picture shown when a flipbook link is shared. Only published, public books show their
// own title and cover; anything else falls back to the generic card, so nothing leaks.

export const alt = "Flipbook";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const target = await getShareTarget((await params).slug);
  return renderOgCard(target ? flipbookCard(target.flipbook, siteHost, target.thumbnailKey) : siteCard(siteHost));
}
