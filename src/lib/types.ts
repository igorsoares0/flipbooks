// Domain types mirroring the data model in the product spec (§31).
// Built from Prisma rows in src/lib/data/mappers.ts; the UI only sees these.

export type FlipbookType = "PDF" | "CANVAS";

export type FlipbookStatus = "UPLOADING" | "DRAFT" | "PROCESSING" | "READY" | "PUBLISHED" | "FAILED" | "ARCHIVED";

export type Visibility = "PUBLIC" | "UNLISTED" | "PRIVATE";

/** Stored in `Flipbook.settings` (JSONB). */
export interface FlipbookSettings {
  backgroundColor: string;
  accentColor: string;
  showBranding: boolean;
  showLogo: boolean;
  showShare: boolean;
  showDownload: boolean;
  showFullscreen: boolean;
  showThumbnails: boolean;
}

export interface Flipbook {
  id: string;
  userId: string;
  title: string;
  slug: string;
  type: FlipbookType;
  status: FlipbookStatus;
  visibility: Visibility;
  description: string;
  settings: FlipbookSettings;
  pageCount: number;
  /** Size of the original PDF in bytes; null for canvas flipbooks. */
  fileSize: number | null;
  /** Last processing error, shown when status is FAILED. */
  error: string | null;
  /** Cover gradient, shown until a rendered thumbnail exists. */
  thumbnailTint: [string, string];
  /** Short-lived signed URL of the rendered first-page thumbnail (PDF flipbooks). */
  thumbnailUrl: string | null;
  views: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface PageBackground {
  color: string;
}

export interface Page {
  id: string;
  flipbookId: string;
  pageNumber: number;
  width: number;
  height: number;
  background: PageBackground;
  /** Storage key of the rendered PDF page, if any. */
  backgroundImageKey: string | null;
  /** Short-lived signed URL for backgroundImageKey, resolved per request; never stored. */
  backgroundImageUrl?: string | null;
  elements: PageElement[];
}

interface ElementBase {
  id: string;
  pageId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
}

export type FontFamily = "sans" | "serif" | "mono";

export interface TextRun {
  text: string;
  italic?: boolean;
}

export interface TextElement extends ElementBase {
  type: "TEXT";
  properties: {
    runs: TextRun[];
    fontFamily: FontFamily;
    fontSize: number;
    fontWeight: number;
    color: string;
    align: "left" | "center" | "right";
    lineHeight: number;
    letterSpacing: number;
  };
}

export interface ImageElement extends ElementBase {
  type: "IMAGE";
  properties: {
    /** Storage key of the user's uploaded picture (`assets/{userId}/…`); null for placeholders. */
    assetKey: string | null;
    /** Short-lived signed URL for assetKey, resolved per request; never stored. */
    imageUrl?: string | null;
    fit: "cover" | "contain";
    /** Gradient shown when there is no picture (or it was deleted). */
    placeholder: { from: string; to: string; label: string; labelPosition: "center" | "bottom-left" };
  };
}

export interface ShapeElement extends ElementBase {
  type: "SHAPE";
  properties: {
    shape: "rect" | "ellipse" | "line";
    fill: string;
    radius: number;
  };
}

export type PageElement = TextElement | ImageElement | ShapeElement;

export type ElementType = PageElement["type"];

export interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export type Plan = "FREE" | "LIFETIME";

export interface Entitlements {
  plan: Plan;
  canUseCanvasEditor: boolean;
  canRemoveBranding: boolean;
  canUseCustomSlug: boolean;
  canUseAnalytics: boolean;
  canEmbed: boolean;
  maxStorageBytes: number;
  maxPagesProcessed: number;
  maxMonthlyViews: number;
  maxBandwidthBytes: number;
  maxPdfBytes: number;
  maxPdfPages: number;
}

export interface Usage {
  storageBytes: number;
  pagesProcessed: number;
  monthlyViews: number;
  bandwidthBytes: number;
}

export interface Billing {
  plan: Plan;
  provider: "paddle";
  /** Null on the free plan. */
  purchasedAt: string | null;
  expiresAt: string | null;
  entitlements: Entitlements;
  usage: Usage;
}

export interface DashboardStats {
  flipbookCount: number;
  publishedThisMonth: number;
  totalViews: number;
  viewsDelta: number;
  avgReadSeconds: number;
  storageBytes: number;
  storageLimitBytes: number;
}

export type AnalyticsRange = "30d" | "90d" | "all";

export interface AnalyticsSummary {
  range: AnalyticsRange;
  totals: {
    views: number;
    uniqueVisitors: number;
    pageViews: number;
    avgReadSeconds: number;
    shares: number;
    downloads: number;
  };
  /** Change vs. the previous period: ratios, except avgReadSeconds (seconds). */
  deltas: AnalyticsSummary["totals"];
  /** Views per page, index 0 = page 1. */
  viewsPerPage: number[];
  devices: { name: string; share: number }[];
  countries: { name: string; views: number }[];
}

export type TemplateCategory =
  | "Magazines"
  | "Catalogs"
  | "Business"
  | "Brochures"
  | "Portfolios"
  | "Reports"
  | "Marketing";

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  pageCount: number;
  tint: string;
}
