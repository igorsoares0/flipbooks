import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Editor } from "@/editor/components/editor";
import { DRAFT_FLIPBOOK_ID, getEditorDocument } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/dashboard/flipbooks/[id]/editor">): Promise<Metadata> {
  const doc = await getEditorDocument((await params).id);
  return { title: doc ? `Editing ${doc.flipbook.title}` : "Editor" };
}

export default async function EditorPage({ params, searchParams }: PageProps<"/dashboard/flipbooks/[id]/editor">) {
  const { id } = await params;
  const { template } = await searchParams;
  const templateId = typeof template === "string" ? template : undefined;
  const doc = await getEditorDocument(id, templateId);
  if (!doc) notFound();

  return (
    <Editor
      key={`${id}:${templateId ?? ""}`}
      title={doc.flipbook.title}
      type={doc.flipbook.type}
      pages={doc.pages}
      previewHref={id === DRAFT_FLIPBOOK_ID ? null : `/f/${doc.flipbook.slug}`}
    />
  );
}
