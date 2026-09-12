import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Viewer } from "@/components/viewer/viewer";
import { getFlipbookPages, getViewableFlipbook } from "@/lib/data";
import { publicFlipbookUrl } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/f/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const flipbook = await getViewableFlipbook({ slug });
  if (!flipbook) return { title: "Flipbook not found" };

  const indexable = flipbook.status === "PUBLISHED" && flipbook.visibility === "PUBLIC";
  return {
    title: flipbook.title,
    description: flipbook.description,
    alternates: { canonical: `/f/${flipbook.slug}` },
    robots: indexable ? undefined : { index: false, follow: false },
    openGraph: {
      type: "article",
      title: flipbook.title,
      description: flipbook.description,
      url: `/f/${flipbook.slug}`,
      siteName: "Flipbook",
    },
    twitter: { card: "summary_large_image", title: flipbook.title, description: flipbook.description },
  };
}

export default async function PublicViewerPage({ params, searchParams }: PageProps<"/f/[slug]">) {
  const { slug } = await params;
  const { page } = await searchParams;
  const flipbook = await getViewableFlipbook({ slug });
  if (!flipbook) notFound();
  const pages = await getFlipbookPages(flipbook.id);

  return (
    <Viewer
      flipbook={{ title: flipbook.title, settings: flipbook.settings }}
      pages={pages}
      initialPage={Number(page) || 1}
      publicUrl={publicFlipbookUrl(flipbook.slug)}
      downloadHref={flipbook.type === "PDF" && flipbook.settings.showDownload ? `/api/flipbooks/${flipbook.id}/download` : null}
    />
  );
}
