import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getObject } from "@/lib/storage";
import { fit, OG_SIZE, type OgCard } from "./card";

// Renders the share preview (Open Graph / Twitter) for a card. Runs on the server per
// request, so it never depends on a signed URL that would expire in a crawler's cache.

const INK = "#17150F";
const PAPER = "#F3F1EC";
const MUTED = "#B7B2A5";

let serif: ArrayBuffer | null | undefined;

/** The brand serif, bundled in public/fonts. Missing file: fall back to the built-in font. */
async function serifFont() {
  if (serif === undefined) {
    serif = await readFile(path.join(process.cwd(), "public/fonts/InstrumentSerif-Regular.ttf"))
      .then((file) => file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer)
      .catch(() => null);
  }
  return serif;
}

/** Rendered pages are WebP, which the image renderer can't read; PNG it is. */
async function coverPng(key: string) {
  try {
    return `data:image/png;base64,${(await sharp(await getObject(key)).resize(560, 740, { fit: "inside" }).png().toBuffer()).toString("base64")}`;
  } catch (error) {
    console.error("[og] cover failed", key, error);
    return null;
  }
}

export async function renderOgCard(card: OgCard) {
  const [font, cover] = await Promise.all([serifFont(), card.coverKey ? coverPng(card.coverKey) : null]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: INK, color: PAPER, fontFamily: font ? "Instrument Serif" : undefined }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 72, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 36 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: card.accent }} />
            <div style={{ fontSize: 24, letterSpacing: -0.4 }}>Flipbook</div>
          </div>
          <div style={{ fontSize: 68, lineHeight: 1.05, letterSpacing: -2 }}>{fit(card.title, 70)}</div>
          <div style={{ fontSize: 28, lineHeight: 1.45, color: MUTED, marginTop: 24 }}>{fit(card.subtitle, 140)}</div>
          <div style={{ display: "flex", marginTop: "auto", fontSize: 22, color: MUTED }}>{fit(card.meta, 70)}</div>
        </div>
        {cover && (
          <div style={{ display: "flex", alignItems: "center", padding: 56, paddingLeft: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" width={420} style={{ borderRadius: 4, objectFit: "contain" }} />
          </div>
        )}
      </div>
    ),
    {
      ...OG_SIZE,
      ...(font ? { fonts: [{ name: "Instrument Serif", data: font, style: "normal", weight: 400 }] } : {}),
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    },
  );
}
