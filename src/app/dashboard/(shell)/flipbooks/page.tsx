import type { Metadata } from "next";
import { toFlipbookRows } from "@/components/dashboard/flipbook-rows";
import { FlipbookTable } from "@/components/dashboard/flipbook-table";
import { ProcessingWatcher } from "@/components/dashboard/processing-watcher";
import { getFlipbooks } from "@/lib/data";

export const metadata: Metadata = { title: "Flipbooks" };

export default async function FlipbooksPage({ searchParams }: PageProps<"/dashboard/flipbooks">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : undefined;
  const flipbooks = await getFlipbooks(query);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      <ProcessingWatcher active={flipbooks.some((fb) => fb.status === "UPLOADING" || fb.status === "PROCESSING")} />
      {query && (
        <p className="text-[12.5px] text-muted">
          {flipbooks.length} result{flipbooks.length === 1 ? "" : "s"} for <span className="font-semibold text-ink">“{query}”</span>
        </p>
      )}
      <FlipbookTable
        title={query ? "Search results" : "All flipbooks"}
        rows={toFlipbookRows(flipbooks)}
        emptyMessage={query ? "No flipbooks match that search." : undefined}
      />
    </div>
  );
}
