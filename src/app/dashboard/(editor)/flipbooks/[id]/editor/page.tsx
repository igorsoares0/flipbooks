import { LayoutTemplate } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/dashboard/placeholder-page";
import { ButtonLink } from "@/components/ui/button";
import { Editor } from "@/editor/components/editor";
import { getAssets, getEditorDocument, getEntitlements } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/dashboard/flipbooks/[id]/editor">): Promise<Metadata> {
  const doc = await getEditorDocument((await params).id);
  return { title: doc ? `Editing ${doc.flipbook.title}` : "Editor" };
}

export default async function EditorPage({ params }: PageProps<"/dashboard/flipbooks/[id]/editor">) {
  const { id } = await params;
  const [doc, entitlements] = await Promise.all([getEditorDocument(id), getEntitlements()]);
  if (!doc) notFound();

  if (!entitlements.canUseCanvasEditor) {
    return (
      <div className="flex min-h-dvh items-center bg-paper px-4">
        <PlaceholderPage
          icon={LayoutTemplate}
          title="The canvas editor is part of the Lifetime Deal"
          body="Design pages from scratch with text, images and shapes, with autosave, undo and templates."
          action={
            <div className="flex justify-center gap-2">
              <ButtonLink href="/dashboard" variant="secondary">
                Back to dashboard
              </ButtonLink>
              <ButtonLink href="/dashboard/billing?upgrade=canvas">See the Lifetime Deal</ButtonLink>
            </div>
          }
        />
      </div>
    );
  }

  const assets = await getAssets();
  return (
    <Editor
      key={id}
      flipbookId={doc.flipbook.id}
      title={doc.flipbook.title}
      type={doc.flipbook.type}
      slug={doc.flipbook.slug}
      published={doc.flipbook.status === "PUBLISHED"}
      updatedAt={doc.flipbook.updatedAt}
      pages={doc.pages}
      assets={assets.map(({ id, key, url, filename, width, height }) => ({ id, key, url, filename, width, height }))}
    />
  );
}
