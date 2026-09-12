import { ChartNoAxesColumn } from "lucide-react";
import { redirect } from "next/navigation";
import { PlaceholderPage } from "@/components/dashboard/placeholder-page";
import { getTopFlipbook } from "@/lib/data";

// Analytics are per flipbook; the sidebar entry opens the most-read one.
export default async function AnalyticsIndexPage() {
  const top = await getTopFlipbook();
  if (top?.status === "PUBLISHED") redirect(`/dashboard/flipbooks/${top.id}/analytics`);

  return (
    <PlaceholderPage
      icon={ChartNoAxesColumn}
      title="No analytics yet"
      body="Publish a flipbook to start measuring views, reading time and per-page drop-off."
    />
  );
}
