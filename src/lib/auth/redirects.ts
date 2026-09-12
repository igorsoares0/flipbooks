/** Only same-site paths are allowed as post-login destinations (no open redirects). */
export function safeNext(next: unknown, fallback = "/dashboard") {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
