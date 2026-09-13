"use client";

import { useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { Lock } from "lucide-react";
import type { PageElement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { HANDLES, resizeBox, rotateTo, roundBox, type Guide, type Handle } from "../geometry";
import { useEditorStore } from "../state/editor-context";
import { trackPointer } from "./pointer";

// Selection frame, resize and rotate handles, and snap guides, drawn over the page in
// screen pixels (page units × scale). The page itself is rendered by PageCanvas below.

const HANDLE_POSITION: Record<Handle, string> = {
  nw: "left-0 top-0 cursor-nwse-resize",
  n: "left-1/2 top-0 cursor-ns-resize",
  ne: "left-full top-0 cursor-nesw-resize",
  e: "left-full top-1/2 cursor-ew-resize",
  se: "left-full top-full cursor-nwse-resize",
  s: "left-1/2 top-full cursor-ns-resize",
  sw: "left-0 top-full cursor-nesw-resize",
  w: "left-0 top-1/2 cursor-ew-resize",
};

const HANDLE_LABEL: Record<Handle, string> = {
  nw: "top-left",
  n: "top",
  ne: "top-right",
  e: "right",
  se: "bottom-right",
  s: "bottom",
  sw: "bottom-left",
  w: "left",
};

/** Text grows with its content and lines have no height, so both only resize sideways. */
function handlesFor(element: PageElement): Handle[] {
  if (element.type === "TEXT" || (element.type === "SHAPE" && element.properties.shape === "line")) return ["e", "w"];
  return HANDLES;
}

function frameStyle(element: PageElement, scale: number) {
  return {
    left: element.x * scale,
    top: element.y * scale,
    width: element.width * scale,
    height: Math.max(element.height, 1) * scale,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
  };
}

export function TransformLayer({
  scale,
  selected,
  editingId,
  guides,
  pageRef,
}: {
  scale: number;
  selected: PageElement[];
  editingId: string | null;
  guides: Guide[];
  pageRef: RefObject<HTMLDivElement | null>;
}) {
  const store = useEditorStore();
  // What the current gesture shows next to the frame (size or angle).
  const [readout, setReadout] = useState<string | null>(null);
  const visible = selected.filter((el) => el.visible);
  const single = visible.length === 1 ? visible[0] : null;

  const startResize = (e: ReactPointerEvent, element: PageElement, handle: Handle) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const start = { x: element.x, y: element.y, width: element.width, height: element.height, rotation: element.rotation };
    const corner = handle.length === 2;
    const onlyWidth = handlesFor(element).length === 2;
    const startX = e.clientX;
    const startY = e.clientY;
    store.getState().beginGesture();
    trackPointer(e, {
      move: (ev) => {
        // Pictures keep their proportions from a corner unless Shift is held (and vice versa).
        const keepAspect = corner && (element.type === "IMAGE") !== ev.shiftKey;
        const box = roundBox(resizeBox(start, handle, (ev.clientX - startX) / scale, (ev.clientY - startY) / scale, { keepAspect }));
        const patch = onlyWidth ? { x: box.x, y: box.y, width: box.width } : { x: box.x, y: box.y, width: box.width, height: box.height };
        store.getState().updateElements({ [element.id]: patch });
        setReadout(onlyWidth ? `W ${box.width}` : `${box.width} × ${box.height}`);
      },
      end: () => {
        setReadout(null);
        store.getState().endGesture();
      },
    });
  };

  const startRotate = (e: ReactPointerEvent, element: PageElement) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const start = { x: element.x, y: element.y, width: element.width, height: element.height, rotation: element.rotation };
    store.getState().beginGesture();
    trackPointer(e, {
      move: (ev) => {
        const rotation = rotateTo(start, (ev.clientX - rect.left) / scale, (ev.clientY - rect.top) / scale, { snap: ev.shiftKey });
        store.getState().updateElements({ [element.id]: { rotation } });
        setReadout(`${Math.round(rotation)}°`);
      },
      end: () => {
        setReadout(null);
        store.getState().endGesture();
      },
    });
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10" data-testid="transform-layer">
      {guides.map((guide, i) => (
        <div
          key={i}
          data-testid="snap-guide"
          className={cn("absolute bg-[#E5484D]", guide.axis === "x" ? "top-0 bottom-0 w-px" : "right-0 left-0 h-px")}
          style={guide.axis === "x" ? { left: guide.at * scale } : { top: guide.at * scale }}
        />
      ))}

      {visible.map((element) => (
        <div
          key={element.id}
          data-testid="selection-frame"
          className={cn(
            "absolute outline-[1.5px] -outline-offset-[0.5px] outline-accent",
            element.locked && "outline-dashed",
            element.type === "SHAPE" && element.properties.shape === "ellipse" && "rounded-full",
          )}
          style={frameStyle(element, scale)}
        >
          {single === element && !element.locked && editingId !== element.id && (
            <>
              {handlesFor(element).map((handle) => (
                <span
                  key={handle}
                  role="slider"
                  aria-label={`Resize from ${HANDLE_LABEL[handle]}`}
                  aria-valuenow={Math.round(element.width)}
                  data-handle={handle}
                  className={cn(
                    "pointer-events-auto absolute size-[9px] -translate-1/2 touch-none border-[1.5px] border-accent bg-white",
                    handle.length === 1 && (handle === "n" || handle === "s") && "h-[7px] w-[14px] rounded-full",
                    handle.length === 1 && (handle === "e" || handle === "w") && "h-[14px] w-[7px] rounded-full",
                    HANDLE_POSITION[handle],
                  )}
                  onPointerDown={(e) => startResize(e, element, handle)}
                />
              ))}
              <span className="absolute top-0 left-1/2 h-4 w-px -translate-x-1/2 -translate-y-full bg-accent" />
              <span
                role="slider"
                aria-label="Rotate"
                aria-valuenow={Math.round(element.rotation)}
                data-handle="rotate"
                className="pointer-events-auto absolute top-0 left-1/2 size-3 -translate-x-1/2 -translate-y-[calc(100%+14px)] cursor-grab touch-none rounded-full border-[1.5px] border-accent bg-white"
                onPointerDown={(e) => startRotate(e, element)}
              />
            </>
          )}
          {single === element && element.locked && (
            <span className="absolute -top-2.5 -right-2.5 grid size-5 place-items-center rounded-full bg-accent text-white">
              <Lock className="size-2.5" strokeWidth={2.5} aria-label="Locked" />
            </span>
          )}
          {single === element && readout && (
            <span
              className="absolute top-full left-1/2 mt-2 -translate-x-1/2 rounded-sm bg-ink px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-white"
              style={{ transform: element.rotation ? `translateX(-50%) rotate(${-element.rotation}deg)` : undefined }}
            >
              {readout}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
