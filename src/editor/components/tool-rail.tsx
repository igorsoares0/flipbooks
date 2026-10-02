"use client";

import { Diamond, Image as ImageIcon, Layers, Shapes, Type, Upload, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditor } from "../state/editor-context";
import type { Tool } from "../state/editor-store";

export const TOOLS: { value: Tool; label: string; icon: LucideIcon }[] = [
  { value: "text", label: "Text", icon: Type },
  { value: "shapes", label: "Shapes", icon: Shapes },
  { value: "uploads", label: "Uploads", icon: Upload },
  { value: "elements", label: "Elements", icon: Diamond },
  { value: "photos", label: "Photos", icon: ImageIcon },
  { value: "layers", label: "Layers", icon: Layers },
];

export function ToolRail() {
  const tool = useEditor((s) => s.tool);
  const selectTool = useEditor((s) => s.selectTool);

  return (
    <nav className="flex w-[72px] shrink-0 flex-col items-center gap-1 border-r border-line bg-surface pt-3" aria-label="Tools">
      {TOOLS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => selectTool(value)}
          aria-pressed={tool === value}
          className={cn(
            "flex h-14 w-[60px] flex-col items-center justify-center gap-[5px] rounded-[10px] text-[11px]",
            tool === value ? "bg-accent-tint font-semibold text-accent" : "text-ink hover:bg-hover",
          )}
        >
          <Icon className={cn("size-[18px]", tool !== value && "opacity-60")} strokeWidth={1.6} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
