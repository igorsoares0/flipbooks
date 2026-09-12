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
    <nav className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-2.5" aria-label="Tools">
      {TOOLS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => selectTool(value)}
          aria-pressed={tool === value}
          className={cn(
            "flex h-[50px] w-12 flex-col items-center justify-center gap-1 rounded-[10px] text-ink",
            tool === value ? "bg-surface-alt" : "hover:bg-surface-sunken",
          )}
        >
          <Icon className="size-4" strokeWidth={1.5} />
          <span className="text-[9.5px] font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
}
