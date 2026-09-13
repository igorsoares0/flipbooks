import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { ImageElement, Page, PageElement, ShapeElement, TextElement } from "@/lib/types";
import { cn } from "@/lib/utils";

// Renders a normalized Page (background + elements) at any size. Element geometry is
// stored in page units; positions are converted to percentages and type sizes to
// container-query units, so the same page renders identically in the editor
// artboard, the viewer spread and tiny thumbnails (spec §20).

const FONT_FAMILY = {
  sans: "var(--font-sans)",
  serif: "var(--font-serif)",
  mono: "var(--font-mono)",
} as const;

export const FONT_LABEL = {
  sans: "Instrument Sans",
  serif: "Instrument Serif",
  mono: "JetBrains Mono",
} as const;

/** Page units → CSS length that scales with the rendered page width. */
function scaled(value: number, page: Pick<Page, "width">) {
  return `calc(${value} / ${page.width} * 100cqw)`;
}

export function elementBoxStyle(element: PageElement, page: Pick<Page, "width" | "height">): CSSProperties {
  return {
    position: "absolute",
    left: `${(element.x / page.width) * 100}%`,
    top: `${(element.y / page.height) * 100}%`,
    width: `${(element.width / page.width) * 100}%`,
    // Text boxes grow with their content; everything else has a fixed height.
    height: element.type === "TEXT" ? undefined : `${(element.height / page.height) * 100}%`,
    opacity: element.opacity,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    zIndex: element.zIndex,
  };
}

/** Typography of a text element; shared with the editor's inline text editing. */
export function textStyle(element: TextElement, page: Pick<Page, "width">): CSSProperties {
  const p = element.properties;
  return {
    fontFamily: FONT_FAMILY[p.fontFamily],
    fontSize: scaled(p.fontSize, page),
    fontWeight: p.fontWeight,
    color: p.color,
    textAlign: p.align,
    lineHeight: p.lineHeight,
    letterSpacing: scaled(p.letterSpacing, page),
  };
}

export const TEXT_CLASS = "break-words whitespace-pre-wrap";

function TextContent({ element, page }: { element: TextElement; page: Page }) {
  return (
    <div className={TEXT_CLASS} style={textStyle(element, page)}>
      {element.properties.runs.map((run, i) =>
        run.italic ? <em key={i}>{run.text}</em> : <Fragment key={i}>{run.text}</Fragment>,
      )}
    </div>
  );
}

function ImageContent({ element, page }: { element: ImageElement; page: Page }) {
  const { placeholder, imageUrl, assetKey, fit } = element.properties;
  if (imageUrl) {
    return (
      // Signed, short-lived URL (see PageCanvas below), so no Next image optimizer.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={element.name}
        className="pointer-events-none size-full select-none"
        style={{ objectFit: fit }}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    );
  }
  // An uploaded picture whose file is gone (deleted from the library).
  if (assetKey) {
    return (
      <div className="flex size-full items-center justify-center bg-[repeating-linear-gradient(45deg,#EEEBE3_0_8px,#E6E2D8_8px_16px)]">
        <span className="font-mono text-[rgba(23,21,15,.45)] @max-[160px]:hidden" style={{ fontSize: `max(6px, ${scaled(11, page)})` }}>
          Image missing
        </span>
      </div>
    );
  }
  const centered = placeholder.labelPosition === "center";
  return (
    <div
      className={cn("flex size-full", centered ? "items-center justify-center" : "items-end justify-start")}
      style={{
        background: `linear-gradient(150deg, ${placeholder.from}, ${placeholder.to})`,
        padding: centered ? undefined : scaled(22, page),
      }}
    >
      {/* Hidden on thumbnail-sized pages, where it would only be noise. */}
      <span
        className="font-mono font-medium text-[rgba(23,21,15,.45)] @max-[160px]:hidden"
        style={{ fontSize: `max(6px, ${scaled(11, page)})` }}
      >
        {placeholder.label}
      </span>
    </div>
  );
}

function ShapeContent({ element, page }: { element: ShapeElement; page: Page }) {
  const p = element.properties;
  return (
    <div
      className="size-full"
      style={{
        background: p.fill,
        borderRadius: p.shape === "ellipse" ? "50%" : scaled(p.radius, page),
      }}
    />
  );
}

export function ElementContent({ element, page }: { element: PageElement; page: Page }) {
  switch (element.type) {
    case "TEXT":
      return <TextContent element={element} page={page} />;
    case "IMAGE":
      return <ImageContent element={element} page={page} />;
    case "SHAPE":
      return <ShapeContent element={element} page={page} />;
  }
}

export function PageCanvas({
  page,
  className,
  style,
  renderElement,
  children,
}: {
  page: Page;
  className?: string;
  style?: CSSProperties;
  /** Custom element wrapper, e.g. the editor's selectable boxes. */
  renderElement?: (element: PageElement) => ReactNode;
  /** Overlays drawn above the page content (gutter shadows, page numbers). */
  children?: ReactNode;
}) {
  const elements = page.elements.filter((el) => el.visible).toSorted((a, b) => a.zIndex - b.zIndex);
  return (
    <div
      className={cn("@container relative overflow-hidden", className)}
      style={{ background: page.background.color, aspectRatio: `${page.width} / ${page.height}`, ...style }}
    >
      {page.backgroundImageUrl && (
        // Rendered PDF page. A plain <img>: the URL is short-lived and signed, so the Next
        // image optimizer can't cache it; pages are already sized WebP from the worker.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={page.backgroundImageUrl}
          alt={`Page ${page.pageNumber}`}
          className="pointer-events-none absolute inset-0 size-full object-cover select-none"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      )}
      {elements.map((element) =>
        renderElement ? (
          renderElement(element)
        ) : (
          <div key={element.id} style={elementBoxStyle(element, page)}>
            <ElementContent element={element} page={page} />
          </div>
        ),
      )}
      {children}
    </div>
  );
}
