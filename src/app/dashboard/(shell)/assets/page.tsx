import { Image as ImageIcon } from "lucide-react";
import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/dashboard/placeholder-page";

export const metadata: Metadata = { title: "Assets" };

export default function AssetsPage() {
  return (
    <PlaceholderPage
      icon={ImageIcon}
      title="Your asset library"
      body="Images you upload in the editor will collect here, ready to reuse across flipbooks. JPG, PNG, WebP and SVG."
    />
  );
}
