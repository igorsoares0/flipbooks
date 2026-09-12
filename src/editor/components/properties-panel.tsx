"use client";

import { FONT_LABEL } from "@/components/flipbook/page-canvas";
import { TypeBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import type { TextElement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useActivePage, useEditor, useSelectedElement } from "../state/editor-context";

const SWATCHES = ["#17150F", "#1B45D6", "#C0392B", "#1C7A52"];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="label-mono mb-[9px] text-muted-3">{children}</div>;
}

const box = "rounded-lg border border-line px-[9px] py-[7px] text-[12.5px]";

// Read-only in phase 1: values reflect the selection; editing arrives with the Konva editor.
function Slider({ label, value, display, fill }: { label: string; value: number; display: string; fill: boolean }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <>
      <div className="mb-1.5 flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-mono text-[11.5px] font-medium text-muted">{display}</span>
      </div>
      <div className="relative mb-3.5 h-1 rounded-[3px] bg-track">
        {fill && <div className="h-full rounded-[3px] bg-ink" style={{ width: `${pct}%` }} />}
        <div
          className="absolute -top-1 -ml-1.5 size-3 rounded-full border-[1.5px] border-ink bg-white"
          style={{ left: `${pct}%` }}
        />
      </div>
    </>
  );
}

function Typography({ element }: { element: TextElement }) {
  const p = element.properties;
  return (
    <div className="mt-1.5">
      <SectionLabel>TYPOGRAPHY</SectionLabel>
      <div className={cn(box, "mb-2 flex justify-between px-2.5 py-2")}>
        <span className={cn(p.fontFamily === "serif" ? "font-serif text-sm" : p.fontFamily === "mono" ? "font-mono" : "")}>
          {FONT_LABEL[p.fontFamily]}
        </span>
        <span className="text-muted-3">▾</span>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <div className={box}>{p.fontSize} px</div>
        <div className={box}>{p.lineHeight} lh</div>
      </div>
      <div className="mb-2 flex gap-1.5">
        {(["left", "center", "right"] as const).map((align) => (
          <div
            key={align}
            className={cn(
              "flex-1 rounded-lg border p-[7px] text-center text-xs capitalize",
              p.align === align ? "border-ink font-semibold" : "border-line text-muted",
            )}
          >
            {align}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-[7px]">
        {SWATCHES.map((c) => (
          <div
            key={c}
            className={cn("size-[26px] rounded-[7px]", c.toUpperCase() === p.color.toUpperCase() && "border-[1.5px] border-ink shadow-[inset_0_0_0_2px_#fff]")}
            style={{ background: c }}
          />
        ))}
        <span className="ml-0.5 font-mono text-[11px] font-medium text-muted-2">{p.color.toUpperCase()}</span>
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const page = useActivePage();
  const element = useSelectedElement();
  const pageCount = useEditor((s) => s.pages.length);
  const duplicate = useEditor((s) => s.duplicateSelection);
  const remove = useEditor((s) => s.deleteSelection);

  const target = element ?? { name: `Page ${page.pageNumber}`, type: "PAGE", x: 0, y: 0, width: page.width, height: page.height, rotation: 0, opacity: 1 };
  const fields = [
    ["X", target.x],
    ["Y", target.y],
    ["W", target.width],
    ["H", target.height],
  ] as const;

  return (
    <aside className="w-[250px] shrink-0 overflow-auto border-l border-line bg-surface p-4 max-md:hidden" aria-label="Properties">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="truncate text-[12.5px] font-semibold">{target.name}</h2>
        <TypeBadge className="ml-auto">{target.type}</TypeBadge>
      </div>

      <SectionLabel>POSITION &amp; SIZE</SectionLabel>
      <div className="mb-[18px] grid grid-cols-2 gap-2">
        {fields.map(([key, value]) => (
          <div key={key} className={cn(box, "flex items-center gap-[7px]")}>
            <span className="font-mono text-[10.5px] font-medium text-muted-3">{key}</span>
            <span className="font-medium">{Math.round(value)}</span>
          </div>
        ))}
      </div>

      <SectionLabel>TRANSFORM</SectionLabel>
      <Slider label="Rotation" value={(target.rotation + 180) / 360} display={`${target.rotation}°`} fill={false} />
      <Slider label="Opacity" value={target.opacity} display={`${Math.round(target.opacity * 100)}%`} fill />

      {element?.type === "TEXT" && <Typography element={element} />}

      <div className="mt-[22px] flex gap-2 border-t border-[#F0ECE3] pt-3.5">
        <Button variant="secondary" size="sm" className="flex-1 p-2 text-xs" onClick={duplicate}>
          Duplicate
        </Button>
        <Button
          variant="danger"
          size="sm"
          className="flex-1 p-2 text-xs"
          onClick={remove}
          disabled={!element && pageCount === 1}
        >
          Delete
        </Button>
      </div>
    </aside>
  );
}
