import { OG_SIZE, siteCard } from "@/lib/og/card";
import { renderOgCard } from "@/lib/og/image";
import { siteHost } from "@/lib/site";

// The site's own share preview, used by every page without one of its own.

export const alt = "Flipbook — create stunning flipbooks";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function OpengraphImage() {
  return renderOgCard(siteCard(siteHost));
}
