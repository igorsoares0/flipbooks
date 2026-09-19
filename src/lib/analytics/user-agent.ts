// Classifies readers from the User-Agent header. Nothing else about the browser is kept.

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|go-http-client/i;

/** Crawlers, link previews and scripts, which shouldn't count as readers. */
export function isBot(userAgent: string | null | undefined) {
  return !userAgent || BOT.test(userAgent);
}

export type Device = "Mobile" | "Tablet" | "Desktop";

export function deviceOf(userAgent: string): Device {
  if (/ipad|tablet|kindle|silk|playbook|android(?!.*mobile)/i.test(userAgent)) return "Tablet";
  if (/mobi|iphone|ipod|windows phone/i.test(userAgent)) return "Mobile";
  return "Desktop";
}
