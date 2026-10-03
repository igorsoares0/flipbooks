import { redirect } from "next/navigation";

/** The list lives on /dashboard now; keep old links and bookmarks working. */
export default async function FlipbooksPage({ searchParams }: PageProps<"/dashboard/flipbooks">) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  const search = params.toString();
  redirect(search ? `/dashboard?${search}` : "/dashboard");
}
