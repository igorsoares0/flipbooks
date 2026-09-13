"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ElementContent, elementBoxStyle, PageCanvas } from "@/components/flipbook/page-canvas";
import type { PageElement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { snapMove, type Box, type Guide } from "../geometry";
import { useActivePage, useEditor, useEditorStore, useSelectedElements } from "../state/editor-context";
import { useAssetUpload } from "./asset-upload";
import { trackPointer } from "./pointer";
import { TextEditing } from "./text-editing";
import { TransformLayer } from "./transform-layer";

// The page being edited. PageCanvas renders it exactly as readers see it; the editor adds
// pointer handling on each element and the TransformLayer on top. The page is drawn at
// page.width × scale pixels, and PageCanvas's % and cqw units take care of the rest.

const PADDING = 28;
const MAX_FIT = 1.5;
// Screen pixels: how far a drag must go before it counts, and how close snapping pulls.
const DRAG_THRESHOLD = 3;
const SNAP_DISTANCE = 6;

function groupBox(elements: PageElement[]): Box {
  if (elements.length === 1) return elements[0];
  const left = Math.min(...elements.map((el) => el.x));
  const top = Math.min(...elements.map((el) => el.y));
  const right = Math.max(...elements.map((el) => el.x + el.width));
  const bottom = Math.max(...elements.map((el) => el.y + el.height));
  return { x: left, y: top, width: right - left, height: bottom - top, rotation: 0 };
}

export function Artboard() {
  const store = useEditorStore();
  const page = useActivePage();
  const selected = useSelectedElements();
  const zoom = useEditor((s) => s.zoom);
  const fitScale = useEditor((s) => s.fitScale);
  const editingId = useEditor((s) => s.editingId);
  const setFitScale = useEditor((s) => s.setFitScale);
  const { upload } = useAssetUpload();
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [dropping, setDropping] = useState(false);
  const scale = zoom === "fit" ? fitScale : zoom;
  const scaleRef = useRef(scale);
  const selectedIds = selected.map((el) => el.id);

  useLayoutEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // "Fit" follows the space the artboard has.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => {
      const fit = Math.min((viewport.clientWidth - PADDING * 2) / page.width, (viewport.clientHeight - PADDING * 2) / page.height);
      setFitScale(Math.round(Math.min(MAX_FIT, Math.max(0.1, fit)) * 1000) / 1000);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [page.width, page.height, setFitScale]);

  // Text boxes grow with their content. Their stored height follows what is rendered, so
  // the selection frame, snapping and alignment use the real size.
  const heightObserver = useRef<ResizeObserver | null>(null);
  useEffect(() => () => heightObserver.current?.disconnect(), []);
  const observeText = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || typeof ResizeObserver === "undefined") return;
      heightObserver.current ??= new ResizeObserver((entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          const id = target.dataset.elementId;
          if (id) store.getState().syncHeight(id, target.offsetHeight / scaleRef.current);
        }
      });
      const observer = heightObserver.current;
      observer.observe(node);
      return () => observer.unobserve(node);
    },
    [store],
  );

  const startMove = (e: ReactPointerEvent, element: PageElement) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (element.id === editingId) return; // clicks inside the text being edited place the caret

    const state = store.getState();
    if (e.shiftKey || e.metaKey || e.ctrlKey) return state.select(element.id, { additive: true });
    if (!state.selectedIds.includes(element.id)) state.select(element.id);

    const ids = new Set(store.getState().selectedIds);
    const moving = page.elements.filter((el) => ids.has(el.id) && !el.locked);
    if (moving.length === 0) return;
    const starts = new Map(moving.map((el) => [el.id, { x: el.x, y: el.y }]));
    const others = page.elements.filter((el) => el.visible && !ids.has(el.id));
    const group = groupBox(moving);
    const startX = e.clientX;
    const startY = e.clientY;
    let started = false;

    trackPointer(e, {
      move: (ev) => {
        const dxPx = ev.clientX - startX;
        const dyPx = ev.clientY - startY;
        if (!started) {
          if (Math.hypot(dxPx, dyPx) < DRAG_THRESHOLD) return;
          started = true;
          store.getState().beginGesture();
        }
        let dx = dxPx / scale;
        let dy = dyPx / scale;
        let nextGuides: Guide[] = [];
        // Alt drags freely.
        if (!ev.altKey) {
          const snapped = snapMove({ ...group, x: group.x + dx, y: group.y + dy }, page, others, SNAP_DISTANCE / scale);
          dx = snapped.x - group.x;
          dy = snapped.y - group.y;
          nextGuides = snapped.guides;
        }
        setGuides(nextGuides);
        store.getState().updateElements(
          Object.fromEntries(
            moving.map((el) => {
              const start = starts.get(el.id)!;
              return [el.id, { x: Math.round(start.x + dx), y: Math.round(start.y + dy) }];
            }),
          ),
        );
      },
      end: () => {
        setGuides([]);
        if (started) store.getState().endGesture();
      },
    });
  };

  const onDrop = (e: ReactDragEvent) => {
    e.preventDefault();
    setDropping(false);
    const files = [...e.dataTransfer.files].filter((file) => file.type.startsWith("image/"));
    if (files.length > 0) void upload(files, { place: true });
  };

  return (
    <div
      ref={viewportRef}
      data-testid="artboard"
      className={cn("relative flex min-h-0 flex-1 overflow-auto", dropping && "bg-accent-soft")}
      style={{ padding: PADDING }}
      onPointerDown={(e) => e.button === 0 && store.getState().select(null)}
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes("Files")) return;
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDropping(false);
      }}
      onDrop={onDrop}
    >
      {/* m-auto centers the page and still lets it scroll when zoomed in past the viewport. */}
      <div
        ref={pageRef}
        className="relative m-auto shrink-0"
        style={{ width: page.width * scale, height: page.height * scale }}
        data-testid="artboard-page"
        data-scale={scale}
      >
        <PageCanvas
          page={page}
          // isolate keeps element z-indexes inside the page, under the transform layer.
          className="isolate shadow-canvas"
          style={{ width: "100%" }}
          renderElement={(element) => {
            const editing = element.id === editingId && element.type === "TEXT";
            return (
              <div
                key={element.id}
                ref={element.type === "TEXT" ? observeText : undefined}
                data-element-id={element.id}
                role="button"
                tabIndex={0}
                aria-label={`Select ${element.name}`}
                aria-pressed={selectedIds.includes(element.id)}
                className={cn(
                  "touch-none outline-none select-none",
                  editing ? "cursor-text select-text" : element.locked ? "cursor-default" : "cursor-move",
                  !selectedIds.includes(element.id) && "hover:outline hover:outline-1 hover:outline-accent/60",
                )}
                style={elementBoxStyle(element, page)}
                onPointerDown={(e) => startMove(e, element)}
                onDoubleClick={() => element.type === "TEXT" && store.getState().startEditing(element.id)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const alreadySelected = store.getState().selectedIds.includes(element.id);
                  if (e.key === "Enter" && alreadySelected && element.type === "TEXT") store.getState().startEditing(element.id);
                  else store.getState().select(element.id);
                }}
              >
                {editing ? <TextEditing element={element} page={page} /> : <ElementContent element={element} page={page} />}
              </div>
            );
          }}
        />
        <TransformLayer scale={scale} selected={selected} editingId={editingId} guides={guides} pageRef={pageRef} />
      </div>
    </div>
  );
}
