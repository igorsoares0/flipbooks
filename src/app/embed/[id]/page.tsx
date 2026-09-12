import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Viewer } from "@/components/viewer/viewer";
import { getFlipbookPages, getViewableFlipbook } from "@/lib/data";
import { publicFlipbookUrl } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/embed/[id]">): Promise<Metadata> {
  const flipbook = await getViewableFlipbook({ id: (await params).id });
  return {
    title: flipbook?.title ?? "Flipbook not found",
    robots: { index: false, follow: false },
  };
}

export default async function EmbedPage({ params, searchParams }: PageProps<"/embed/[id]">) {
  const { id } = await params;
  const { page } = await searchParams;
  const flipbook = await getViewableFlipbook({ id });
  if (!flipbook) notFound();
  const pages = await getFlipbookPages(flipbook.id);

  return (
    <Viewer
      variant="embed"
      flipbook={{ title: flipbook.title, settings: flipbook.settings }}
      pages={pages}
      initialPage={Number(page) || 1}
      publicUrl={publicFlipbookUrl(flipbook.slug)}
    />
  );
}
