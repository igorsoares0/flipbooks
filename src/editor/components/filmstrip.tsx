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
    { label: "Duplicate page", action: () => store.getState().duplicateSelection(), disabled: pages.length >= store.getState().maxPages },
    { label: "Add page after", action: () => store.getState().addPage(), disabled: pages.length >= store.getState().maxPages },
    { label: "Move left", action: () => store.getState().reorderPage(index, index - 1), disabled: index === 0 },
    { label: "Move right", action: () => store.getState().reorderPage(index, index + 1), disabled: index === pages.length - 1 },
    { label: "Delete page", action: () => store.getState().deleteSelection(), disabled: pages.length === 1, danger: true },
  ];

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Page ${index + 1} actions`}
      className="fixed z-50 w-[200px] bg-surface p-1 shadow-menu"
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
        <div key={item.label}>
          {item.danger && <div className="mx-1 my-1 h-px bg-line" role="separator" />}
          <button
            role="menuitem"
            disabled={item.disabled}
            onClick={run(item.action)}
            className={cn(
              "flex h-9 w-full items-center rounded-md px-2.5 text-left text-[13.5px] hover:bg-hover focus-visible:bg-hover focus-visible:outline-none disabled:text-faint disabled:hover:bg-transparent",
              item.danger && "text-danger",
            )}
          >
            {item.label}
          </button>
        </div>
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
  const atLimit = useEditor((s) => s.pages.length >= s.maxPages);
  const maxPages = useEditor((s) => s.maxPages);
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
      className="relative flex h-[118px] shrink-0 items-center gap-2.5 overflow-x-auto border-t border-line bg-surface px-5"
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
            className={cn("flex shrink-0 flex-col items-center gap-1.5 focus-visible:outline-none", drag?.from === index && "opacity-40")}
          >
            <PageCanvas
              page={page}
              className={cn(
                "pointer-events-none w-12",
                active ? "shadow-[0_0_0_2px_var(--color-accent)]" : "shadow-[inset_0_0_0_1px_var(--color-line)]",
                "[button:focus-visible>&]:outline-2 [button:focus-visible>&]:outline-offset-2 [button:focus-visible>&]:outline-accent",
              )}
            />
            <span className={cn("text-[11.5px] tabular-nums", active ? "font-bold text-accent" : "font-medium text-muted")}>{page.pageNumber}</span>
          </button>
        );
      })}
      <button
        onClick={addPage}
        disabled={atLimit}
        title={atLimit ? `Your plan allows ${maxPages} pages per flipbook` : undefined}
        aria-label="Add page"
        className="group flex shrink-0 flex-col items-center gap-1.5 text-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="flex h-16 w-12 items-center justify-center border-[1.5px] border-dashed border-placeholder group-enabled:group-hover:border-accent group-enabled:group-hover:text-accent">
          <Plus className="size-[18px]" strokeWidth={1.4} />
        </span>
        <span className="text-[11.5px]">Add</span>
      </button>
      {drag && (
        <div
          data-testid="page-drop-indicator"
          className="pointer-events-none absolute top-[18px] h-16 w-0.5 bg-accent"
          style={{ left: drag.indicatorX }}
        />
      )}
      {menu && <PageMenu menu={menu} onClose={closeMenu} />}
    </div>
  );
}
