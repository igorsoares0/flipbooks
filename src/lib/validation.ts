import { z } from "zod";
import { DESCRIPTION_MAX, TITLE_MAX } from "@/lib/flipbook-rules";

// Everything a client sends to the server is parsed with these schemas first.

const color = z.string().regex(/^#[0-9a-fA-F]{6}$|^rgba?\([\d\s.,]+\)$/, "Invalid color");
const id = z.string().min(1).max(64);
const coord = z.number().finite().min(-10_000).max(10_000);
const size = z.number().finite().min(0).max(10_000);

const elementBase = {
  id,
  pageId: id,
  name: z.string().min(1).max(80),
  x: coord,
  y: coord,
  width: size,
  height: size,
  rotation: z.number().finite().min(-360).max(360),
  opacity: z.number().min(0).max(1),
  zIndex: z.number().int().min(0).max(10_000),
  locked: z.boolean(),
  visible: z.boolean(),
};

const textElement = z.object({
  ...elementBase,
  type: z.literal("TEXT"),
  properties: z.object({
    runs: z.array(z.object({ text: z.string().max(5_000), italic: z.boolean().optional() })).max(50),
    fontFamily: z.enum(["sans", "serif", "mono"]),
    fontSize: z.number().min(4).max(400),
    fontWeight: z.number().int().min(100).max(900),
    color,
    align: z.enum(["left", "center", "right"]),
    lineHeight: z.number().min(0.5).max(4),
    letterSpacing: z.number().min(-20).max(40),
  }),
});

const imageElement = z.object({
  ...elementBase,
  type: z.literal("IMAGE"),
  properties: z.object({
    assetKey: z.string().max(300).nullable(),
    fit: z.enum(["cover", "contain"]),
    placeholder: z.object({
      from: color,
      to: color,
      label: z.string().max(80),
      labelPosition: z.enum(["center", "bottom-left"]),
    }),
  }),
});

const shapeElement = z.object({
  ...elementBase,
  type: z.literal("SHAPE"),
  properties: z.object({
    shape: z.enum(["rect", "ellipse", "line"]),
    fill: color,
    radius: z.number().min(0).max(1_000),
  }),
});

export const elementSchema = z.discriminatedUnion("type", [textElement, imageElement, shapeElement]);

export const pageSchema = z.object({
  id,
  pageNumber: z.number().int().min(1),
  width: z.number().int().min(100).max(4_000),
  height: z.number().int().min(100).max(4_000),
  background: z.object({ color }),
  backgroundImageKey: z.string().max(300).nullable(),
  elements: z.array(elementSchema).max(500),
});

export const documentSchema = z.array(pageSchema).min(1).max(1_000);

export const settingsSchema = z.object({
  backgroundColor: color,
  accentColor: color,
  showBranding: z.boolean(),
  showLogo: z.boolean(),
  showShare: z.boolean(),
  showDownload: z.boolean(),
  showFullscreen: z.boolean(),
  showThumbnails: z.boolean(),
});

export const flipbookPatchSchema = z
  .object({
    title: z.string().trim().min(1, "Give it a title.").max(TITLE_MAX),
    description: z.string().max(DESCRIPTION_MAX),
    visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]),
    settings: settingsSchema,
  })
  .partial();

export type FlipbookPatch = z.infer<typeof flipbookPatchSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
