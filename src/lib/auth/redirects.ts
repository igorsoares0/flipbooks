const BASE = "https://same-site.invalid";

/**
 * Only same-site paths are allowed as post-login destinations (no open redirects).
 * Browsers drop tabs and newlines from URLs and read "\" as "/", so "/\t/evil.com" means
 * "//evil.com": the path is resolved the way a browser would and must stay on this site.
 */
export function safeNext(next: unknown, fallback = "/dashboard") {
  if (typeof next !== "string" || !next.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  return url.pathname + url.search + url.hash;
}
