"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { PageCanvas } from "@/components/flipbook/page-canvas";
import { cn } from "@/lib/utils";
import { useEditor, useEditorStore } from "../state/editor-context";
import { trackPointer } from "./pointer";

const DRAG_THRESHOLD = 4;

type Menu = { pageId: string; x: number; y: number };

function PageMenu({ menu, onClose }: { menu: Menu; onClose: () => void }) {
  const store = useEditorStore();
  const pages = useEditor((s) => s.pages);
  const index = pages.findIndex((p) => p.id === menu.pageId);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const onPointerDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (index < 0) return null;
  const run = (action: () => void) => () => {
    store.getState().setActivePage(menu.pageId);
    action();
    onClose();
  };
  const items: { label: string; action: () => void; disabled?: boolean; danger?: boolean }[] = [
    { label: "Duplicate page", action: () => store.getState().duplicateSelection() },
    { label: "Move left", action: () => store.getState().reorderPage(index, index - 1), disabled: index === 0 },
    { label: "Move right", action: () => store.getState().reorderPage(index, index + 1), disabled: index === pages.length - 1 },
    { label: "Delete page", action: () => store.getState().deleteSelection(), disabled: pages.length === 1, danger: true },
  ];

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Page ${index + 1} actions`}
      className="fixed z-50 min-w-[160px] rounded-[10px] border border-line bg-surface p-1 shadow-canvas"
      style={{ left: menu.x, top: menu.y, transform: "translateY(-100%)" }}
      onKeyDown={(e) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        e.preventDefault();
        const buttons = [...(ref.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
        buttons[(at + (e.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length]?.focus();
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          role="menuitem"
          disabled={item.disabled}
          onClick={run(item.action)}
          className={cn(
            "block w-full rounded-md px-2.5 py-1.5 text-left text-[12.5px] hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-none disabled:text-muted-3 disabled:hover:bg-transparent",
            item.danger && "text-danger",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Filmstrip() {
  const store = useEditorStore();
  const pages = useEditor((s) => s.pages);
  const activePageId = useEditor((s) => s.activePageId);
  const setActivePage = useEditor((s) => s.setActivePage);
  const addPage = useEditor((s) => s.addPage);
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  // Set while a thumbnail is dragged: which one, and the slot it would drop into.
  const [drag, setDrag] = useState<{ from: number; to: number; indicatorX: number } | null>(null);
  const suppressClick = useRef(false);
  const [menu, setMenu] = useState<Menu | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activePageId]);

  const thumbnails = () => [...(listRef.current?.querySelectorAll<HTMLElement>("[data-page-thumb]") ?? [])];

  const startDrag = (e: ReactPointerEvent, from: number) => {
    if (e.button !== 0 || pages.length < 2) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    let target = from;

    trackPointer(e, {
      move: (ev) => {
        if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
        dragging = true;
        const list = listRef.current!.getBoundingClientRect();
        const others = thumbnails()
          .filter((_, i) => i !== from)
          .map((node) => node.getBoundingClientRect());
        // The slot is the number of other pages whose middle is left of the pointer.
        target = others.filter((rect) => rect.left + rect.width / 2 < ev.clientX).length;
        const edge = target < others.length ? others[target].left - 5 : others[others.length - 1].right + 5;
        setDrag({ from, to: target, indicatorX: edge - list.left + listRef.current!.scrollLeft });
      },
      end: (ev) => {
        setDrag(null);
        if (!dragging || !ev) return;
        // The release still fires a click on the thumbnail; it shouldn't also select it.
        suppressClick.current = true;
        store.getState().reorderPage(from, target);
      },
    });
  };

  return (
    <div
      ref={listRef}
      className="relative flex h-[104px] shrink-0 items-center gap-2.5 overflow-x-auto border-t border-line bg-surface px-4"
      aria-label="Pages"
    >
      {pages.map((page, index) => {
        const active = page.id === activePageId;
        return (
          <button
            key={page.id}
            ref={active ? activeRef : undefined}
            data-page-thumb
            onPointerDown={(e) => startDrag(e, index)}
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              setActivePage(page.id);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              // Keyboard-opened menus (Shift+F10) have no pointer position.
              setMenu({ pageId: page.id, x: e.clientX || rect.left, y: e.clientY || rect.top });
            }}
            onKeyDown={(e) => {
              if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
              e.preventDefault();
              store.getState().reorderPage(index, index + (e.key === "ArrowLeft" ? -1 : 1));
            }}
            aria-label={`Page ${page.pageNumber}`}
            aria-current={active ? "page" : undefined}
            aria-haspopup="menu"
            title="Drag to reorder · right-click for more"
            className={cn("shrink-0 text-center", drag?.from === index && "opacity-40")}
          >
            <PageCanvas
              page={page}
              className={cn(
                "pointer-events-none w-[54px] rounded-[3px] shadow-thumb",
                active ? "outline-2 -outline-offset-2 outline-accent" : "outline-1 -outline-offset-1 outline-line",
              )}
              style={{ outlineStyle: "solid" }}
            />
            <div className="mt-1 font-mono text-[9.5px] font-medium text-muted-2">{page.pageNumber}</div>
          </button>
        );
      })}
      <button
        onClick={addPage}
        aria-label="Add page"
        className="mb-[18px] flex h-[70px] w-[54px] shrink-0 items-center justify-center rounded border-[1.5px] border-dashed border-line-strong bg-surface-sunken text-muted-2 hover:border-accent hover:text-accent"
      >
        <Plus className="size-5" strokeWidth={1.4} />
      </button>
      {drag && (
        <div
          data-testid="page-drop-indicator"
          className="pointer-events-none absolute top-3 h-[72px] w-0.5 rounded-full bg-accent"
          style={{ left: drag.indicatorX }}
        />
      )}
      {menu && <PageMenu menu={menu} onClose={closeMenu} />}
    </div>
  );
}
