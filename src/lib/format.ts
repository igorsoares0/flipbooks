const MINUS = "−";

export function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

/** 48200 → "48.2k", 250000 → "250k". */
export function formatCompact(value: number) {
  if (value < 1000) return String(value);
  const thousands = value / 1000;
  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
}

/** 252 → "4:12". */
export function formatDuration(seconds: number) {
  const sign = seconds < 0 ? MINUS : "";
  const abs = Math.abs(Math.round(seconds));
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
}

/** 0.184 → "+18.4%". */
export function formatPercentDelta(ratio: number) {
  const sign = ratio < 0 ? MINUS : "+";
  return `${sign}${Math.abs(ratio * 100).toFixed(1)}%`;
}

/** Bytes → "2.4" (GB, decimal). */
export function formatGb(bytes: number) {
  const gb = bytes / 1e9;
  return Number.isInteger(gb) ? String(gb) : gb.toFixed(1);
}

export function formatMb(bytes: number) {
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const longDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function formatShortDate(iso: string) {
  return shortDate.format(new Date(iso));
}

export function formatLongDate(iso: string) {
  return longDate.format(new Date(iso));
}

/** "Just now", "2m ago", "2h ago", "Yesterday", then "Sep 4". */
export function formatRelative(iso: string, now = Date.now()) {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  return formatShortDate(iso);
}
