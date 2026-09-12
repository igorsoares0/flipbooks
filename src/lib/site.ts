export const siteUrl = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://flipbook.co");

export const siteHost = siteUrl.host;

export function publicFlipbookUrl(slug: string) {
  return new URL(`/f/${slug}`, siteUrl).toString();
}

export function embedFlipbookUrl(id: string) {
  return new URL(`/embed/${id}`, siteUrl).toString();
}
