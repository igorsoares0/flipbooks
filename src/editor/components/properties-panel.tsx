"use client";

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  BringToFront,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  SendToBack,
  type LucideIcon,
} from "lucide-react";
import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { FONT_LABEL } from "@/components/flipbook/page-canvas";
import { TypeBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import type { FontFamily, ImageElement, PageElement, ShapeElement, TextElement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useActivePage, useEditor, useSelectedElements } from "../state/editor-context";
import type { Align, Arrange, ElementPatch } from "../state/editor-store";

const SWATCHES = ["#17150F", "#FFFFFF", "#1B45D6", "#C0392B", "#1C7A52", "#C98A15"];
const PAGE_SWATCHES = ["#FFFFFF", "#F6F4EF", "#F4EFE6", "#EDF1FB", "#EFF3EF", "#17150F"];
const HEX = /^#[0-9a-f]{6}$/i;
const KIND = { TEXT: "Text", IMAGE: "Image", SHAPE: "Shape" } as const;

/** Label/value on an underline, darker while focused. */
const underline = "border-b border-line-2 pb-1.5 focus-within:border-ink";
const input = "w-full min-w-0 bg-transparent outline-none";
const select = "w-full min-w-0 border-b border-line-2 bg-transparent pb-1.5 text-[13.5px] outline-none focus:border-ink";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-line px-[22px] py-4">
      <h3 className="text-[12.5px] font-semibold text-accent">{title}</h3>
      {children}
    </section>
  );
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * A number input that applies every valid value as you type (the store merges them into
 * one undo step) and snaps back to the real value when left with something invalid.
 */
function NumberField({
  label,
  short,
  value,
  onChange,
  min = -10_000,
  max = 10_000,
  step = 1,
  decimals = 0,
  disabled,
}: {
  label: string;
  short: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(Number(value.toFixed(decimals)));
  const apply = (text: string) => {
    const n = Number(text);
    if (text.trim() === "" || !Number.isFinite(n)) return;
    onChange(clamp(Number(n.toFixed(decimals)), min, max));
  };
  return (
    <label className={cn(underline, "flex items-baseline gap-2", disabled && "text-muted")}>
      <span className="shrink-0 text-muted" aria-hidden>
        {short}
      </span>
      <input
        aria-label={label}
        type="number"
        inputMode="decimal"
        className={cn(input, "text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none")}
        value={shown}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => {
          setDraft(e.target.value);
          apply(e.target.value);
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(null);
            e.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function RangeField({
  label,
  value,
  display,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <label htmlFor={id} className="text-muted">
          {label}
        </label>
        <span className="tabular-nums">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        className={cn(
          "h-3.5 w-full cursor-pointer appearance-none bg-transparent",
          "[&::-webkit-slider-runnable-track]:h-0.5 [&::-webkit-slider-runnable-track]:bg-(image:--track)",
          "[&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[1.5px] [&::-webkit-slider-thumb]:border-ink [&::-webkit-slider-thumb]:bg-white",
          "[&::-moz-range-track]:h-0.5 [&::-moz-range-track]:bg-(image:--track)",
          "[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[1.5px] [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-white",
        )}
        style={{ "--track": `linear-gradient(to right, var(--color-ink) ${pct}%, var(--color-line) ${pct}%)` } as CSSProperties}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function ColorField({ label, value, swatches, onChange }: { label: string; value: string; swatches: string[]; onChange: (color: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const current = value.toUpperCase();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`${label} swatches`}>
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${c}`}
            aria-pressed={c === current}
            onClick={() => onChange(c)}
            className={cn(
              "size-[26px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.1)]",
              c === current && "shadow-[inset_0_0_0_1px_rgba(0,0,0,.1),0_0_0_2px_#fff,0_0_0_3.5px_var(--color-accent)]",
            )}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className={cn(underline, "flex items-center gap-2")}>
        <input
          type="color"
          aria-label={`${label} picker`}
          value={HEX.test(value) ? value.toLowerCase() : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="size-5 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-moz-color-swatch]:rounded-full [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-line [&::-webkit-color-swatch-wrapper]:p-0"
        />
        <input
          aria-label={label}
          className={cn(input, "uppercase tabular-nums")}
          value={draft ?? current}
          maxLength={7}
          onChange={(e) => {
            const text = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
            setDraft(text);
            if (HEX.test(text)) onChange(text.toUpperCase());
          }}
          onBlur={() => setDraft(null)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-full border border-line-2 p-0.5" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-[26px] flex-1 rounded-full text-center",
            option.value === value ? "bg-ink font-semibold text-white" : "text-ink hover:bg-hover",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function IconButton({ icon: Icon, label, onClick, pressed }: { icon: LucideIcon; label: string; onClick: () => void; pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "grid h-8 flex-1 place-items-center rounded-full border text-ink hover:border-ink",
        pressed ? "border-ink bg-ink text-white" : "border-line-2",
      )}
    >
      <Icon className="size-3.5" strokeWidth={1.6} />
    </button>
  );
}

type Update = (patch: ElementPatch, field: string) => void;

function TextProperties({ element, update }: { element: TextElement; update: Update }) {
  const p = element.properties;
  const setProp = (field: keyof TextElement["properties"], value: unknown) => update({ properties: { [field]: value } }, field);
  return (
    <>
      <Section title="Typography">
        <select
          aria-label="Font"
          value={p.fontFamily}
          onChange={(e) => setProp("fontFamily", e.target.value as FontFamily)}
          className={cn(select, "border-ink text-[16px]")}
        >
          {(Object.keys(FONT_LABEL) as FontFamily[]).map((family) => (
            <option key={family} value={family}>
              {FONT_LABEL[family]}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <NumberField label="Font size" short="Size" value={p.fontSize} min={4} max={400} onChange={(v) => setProp("fontSize", v)} />
          <select
            aria-label="Font weight"
            value={p.fontWeight}
            onChange={(e) => setProp("fontWeight", Number(e.target.value))}
            className={select}
          >
            {[
              [400, "Regular"],
              [500, "Medium"],
              [600, "Semibold"],
              [700, "Bold"],
            ].map(([weight, name]) => (
              <option key={weight} value={weight}>
                {name}
              </option>
            ))}
          </select>
          <NumberField label="Line height" short="Leading" value={p.lineHeight} min={0.5} max={4} step={0.05} decimals={2} onChange={(v) => setProp("lineHeight", v)} />
          <NumberField
            label="Letter spacing"
            short="Tracking"
            value={p.letterSpacing}
            min={-20}
            max={40}
            step={0.1}
            decimals={1}
            onChange={(v) => setProp("letterSpacing", v)}
          />
        </div>
        <Segmented
          label="Alignment"
          value={p.align}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
          onChange={(align) => setProp("align", align)}
        />
      </Section>
      <Section title="Color">
        <ColorField label="Text color" value={p.color} swatches={SWATCHES} onChange={(color) => setProp("color", color)} />
      </Section>
    </>
  );
}

function ShapeProperties({ element, update }: { element: ShapeElement; update: Update }) {
  const p = element.properties;
  return (
    <Section title="Fill">
      <ColorField label="Fill color" value={p.fill} swatches={SWATCHES} onChange={(fill) => update({ properties: { fill } }, "fill")} />
      {p.shape === "rect" && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <NumberField label="Corner radius" short="Radius" value={p.radius} min={0} max={1000} onChange={(radius) => update({ properties: { radius } }, "radius")} />
        </div>
      )}
    </Section>
  );
}

function ImageProperties({ element, update }: { element: ImageElement; update: Update }) {
  const assets = useEditor((s) => s.assets);
  const [replacing, setReplacing] = useState(false);
  return (
    <Section title="Image">
      <Segmented
        label="Image fit"
        value={element.properties.fit}
        options={[
          { value: "cover", label: "Fill" },
          { value: "contain", label: "Fit" },
        ]}
        onChange={(fit) => update({ properties: { fit } }, "fit")}
      />
      <Button variant="outline" size="sm" className="w-full" onClick={() => setReplacing((r) => !r)} aria-expanded={replacing}>
        Replace image
      </Button>
      {replacing &&
        (assets.length === 0 ? (
          <p className="text-[12.5px] text-muted">Upload images from the Uploads panel first.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-1.5" aria-label="Replace with">
            {assets.map((asset) => (
              <li key={asset.key}>
                <button
                  aria-label={`Use ${asset.filename}`}
                  onClick={() => {
                    update({ properties: { assetKey: asset.key, imageUrl: asset.url } }, "asset");
                    setReplacing(false);
                  }}
                  className="block aspect-square w-full overflow-hidden bg-canvas hover:shadow-[0_0_0_2px_var(--color-accent)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt="" className="size-full object-cover" draggable={false} />
                </button>
              </li>
            ))}
          </ul>
        ))}
    </Section>
  );
}

function ElementProperties({ element }: { element: PageElement }) {
  const updateElement = useEditor((s) => s.updateElement);
  const arrange = useEditor((s) => s.arrange);
  const toggleLock = useEditor((s) => s.toggleLock);
  const toggleVisible = useEditor((s) => s.toggleVisible);
  const update: Update = (patch, field) => updateElement(element.id, patch, field);
  const autoHeight = element.type === "TEXT";

  return (
    <>
      <Section title="Position & size">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <NumberField label="X" short="X" value={element.x} disabled={element.locked} onChange={(x) => update({ x }, "x")} />
          <NumberField label="Y" short="Y" value={element.y} disabled={element.locked} onChange={(y) => update({ y }, "y")} />
          <NumberField label="Width" short="W" value={element.width} min={1} disabled={element.locked} onChange={(width) => update({ width }, "width")} />
          <NumberField
            label="Height"
            short="H"
            value={element.height}
            min={1}
            disabled={element.locked || autoHeight}
            onChange={(height) => update({ height }, "height")}
          />
        </div>
        {autoHeight && <p className="text-[12px] text-muted">Text height follows its content.</p>}
      </Section>

      <Section title="Transform">
        <RangeField
          label="Rotation"
          value={element.rotation}
          display={`${Math.round(element.rotation)}°`}
          min={-180}
          max={180}
          onChange={(rotation) => update({ rotation }, "rotation")}
        />
        <RangeField
          label="Opacity"
          value={Math.round(element.opacity * 100)}
          display={`${Math.round(element.opacity * 100)}%`}
          min={0}
          max={100}
          onChange={(v) => update({ opacity: v / 100 }, "opacity")}
        />
      </Section>

      {element.type === "TEXT" && <TextProperties element={element} update={update} />}
      {element.type === "SHAPE" && <ShapeProperties element={element} update={update} />}
      {element.type === "IMAGE" && <ImageProperties element={element} update={update} />}

      <Section title="Arrange">
        <div className="flex gap-1.5">
          {(
            [
              ["front", BringToFront, "Bring to front"],
              ["forward", ChevronUp, "Bring forward"],
              ["backward", ChevronDown, "Send backward"],
              ["back", SendToBack, "Send to back"],
            ] as [Arrange, LucideIcon, string][]
          ).map(([to, icon, label]) => (
            <IconButton key={to} icon={icon} label={label} onClick={() => arrange(to)} />
          ))}
          <IconButton icon={element.locked ? Lock : LockOpen} label={element.locked ? "Unlock" : "Lock"} pressed={element.locked} onClick={() => toggleLock(element.id)} />
          <IconButton icon={element.visible ? Eye : EyeOff} label={element.visible ? "Hide" : "Show"} pressed={!element.visible} onClick={() => toggleVisible(element.id)} />
        </div>
      </Section>
    </>
  );
}

function AlignButtons() {
  const align = useEditor((s) => s.align);
  const buttons: [Align, LucideIcon, string][] = [
    ["left", AlignStartVertical, "Align left"],
    ["center", AlignCenterVertical, "Align centers"],
    ["right", AlignEndVertical, "Align right"],
    ["top", AlignStartHorizontal, "Align top"],
    ["middle", AlignCenterHorizontal, "Align middles"],
    ["bottom", AlignEndHorizontal, "Align bottom"],
  ];
  return (
    <div className="flex gap-1.5">
      {buttons.map(([to, icon, label]) => (
        <IconButton key={to} icon={icon} label={label} onClick={() => align(to)} />
      ))}
    </div>
  );
}

function PageProperties() {
  const page = useActivePage();
  const setPageBackground = useEditor((s) => s.setPageBackground);
  return (
    <>
      <Section title="Page size">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <NumberField label="Page width" short="W" value={page.width} disabled onChange={() => undefined} />
          <NumberField label="Page height" short="H" value={page.height} disabled onChange={() => undefined} />
        </div>
      </Section>
      {!page.backgroundImageKey && (
        <Section title="Background">
          <ColorField label="Background color" value={page.background.color} swatches={PAGE_SWATCHES} onChange={setPageBackground} />
        </Section>
      )}
    </>
  );
}

export function PropertiesPanel() {
  const page = useActivePage();
  const selected = useSelectedElements();
  const pageCount = useEditor((s) => s.pages.length);
  const duplicate = useEditor((s) => s.duplicateSelection);
  const remove = useEditor((s) => s.deleteSelection);
  const element = selected.length === 1 ? selected[0] : null;
  const many = selected.length > 1;

  const title = element ? element.name : many ? `${selected.length} elements` : `Page ${page.pageNumber}`;
  const kind = element ? KIND[element.type] : many ? "Group" : "Page";
  const subtitle = element ? `${kind} on page ${page.pageNumber}` : many ? `On page ${page.pageNumber}` : `${pageCount} ${pageCount === 1 ? "page" : "pages"} in this book`;

  return (
    <aside className="flex w-[280px] shrink-0 flex-col overflow-auto border-l border-line bg-surface text-[13.5px] max-md:hidden" aria-label="Properties">
      <div className="flex items-start gap-2.5 border-b border-line px-[22px] pt-5 pb-3.5">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-serif text-[24px] leading-tight tracking-[-0.5px]">{title}</h2>
          <div className="mt-0.5 text-[12.5px] text-muted">{subtitle}</div>
        </div>
        <TypeBadge className="mt-1">{kind}</TypeBadge>
      </div>

      {element && <ElementProperties key={element.id} element={element} />}
      {!element && !many && <PageProperties />}
      {(many || element) && (
        <Section title={many ? "Align" : "Align to page"}>
          <AlignButtons />
        </Section>
      )}

      <div className="mt-auto flex gap-2 border-t border-line px-[22px] py-4">
        <Button variant="outline" size="sm" className="flex-1 px-3" onClick={duplicate}>
          {selected.length === 0 ? "Duplicate page" : "Duplicate"}
        </Button>
        <Button variant="danger" size="sm" className="flex-1 px-3" onClick={remove} disabled={selected.length === 0 && pageCount === 1}>
          {selected.length === 0 ? "Delete page" : "Delete"}
        </Button>
      </div>
    </aside>
  );
}
