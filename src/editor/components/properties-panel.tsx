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
import { useId, useState, type ReactNode } from "react";
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

const box = "rounded-lg border border-line px-[9px] py-[7px] text-[12.5px]";
const input = "w-full min-w-0 bg-transparent font-medium outline-none";

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="label-mono mb-[9px] text-muted-3">{children}</div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-[18px]">
      <SectionLabel>{title}</SectionLabel>
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
    <label className={cn(box, "flex items-center gap-[7px]", disabled ? "bg-surface-sunken text-muted-2" : "focus-within:border-accent")}>
      <span className="font-mono text-[10.5px] font-medium text-muted-3" aria-hidden>
        {short}
      </span>
      <input
        aria-label={label}
        type="number"
        inputMode="decimal"
        className={cn(input, "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none")}
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
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-xs">
        <label htmlFor={id}>{label}</label>
        <span className="font-mono text-[11.5px] font-medium text-muted">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        className="w-full accent-ink"
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
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-[7px]" role="group" aria-label={`${label} swatches`}>
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${c}`}
            aria-pressed={c === current}
            onClick={() => onChange(c)}
            className={cn(
              "size-[26px] rounded-[7px] border border-line",
              c === current && "border-[1.5px] border-ink shadow-[inset_0_0_0_2px_#fff]",
            )}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className={cn(box, "flex items-center gap-2 focus-within:border-accent")}>
        <input
          type="color"
          aria-label={`${label} picker`}
          value={HEX.test(value) ? value.toLowerCase() : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="size-5 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-line [&::-webkit-color-swatch-wrapper]:p-0"
        />
        <input
          aria-label={label}
          className={cn(input, "font-mono text-[11.5px] uppercase")}
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
    <div className="flex gap-1.5" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 rounded-lg border p-[7px] text-center text-xs capitalize",
            option.value === value ? "border-ink font-semibold" : "border-line text-muted hover:border-line-strong",
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
        "grid h-8 flex-1 place-items-center rounded-lg border text-ink hover:border-line-strong",
        pressed ? "border-ink bg-surface-alt" : "border-line",
      )}
    >
      <Icon className="size-3.5" strokeWidth={1.75} />
    </button>
  );
}

type Update = (patch: ElementPatch, field: string) => void;

function TextProperties({ element, update }: { element: TextElement; update: Update }) {
  const p = element.properties;
  const setProp = (field: keyof TextElement["properties"], value: unknown) => update({ properties: { [field]: value } }, field);
  return (
    <>
      <Section title="TYPOGRAPHY">
        <select
          aria-label="Font"
          value={p.fontFamily}
          onChange={(e) => setProp("fontFamily", e.target.value as FontFamily)}
          className={cn(box, "mb-2 w-full bg-surface px-2.5 py-2 outline-none focus:border-accent")}
        >
          {(Object.keys(FONT_LABEL) as FontFamily[]).map((family) => (
            <option key={family} value={family}>
              {FONT_LABEL[family]}
            </option>
          ))}
        </select>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <NumberField label="Font size" short="PX" value={p.fontSize} min={4} max={400} onChange={(v) => setProp("fontSize", v)} />
          <select
            aria-label="Font weight"
            value={p.fontWeight}
            onChange={(e) => setProp("fontWeight", Number(e.target.value))}
            className={cn(box, "bg-surface outline-none focus:border-accent")}
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
          <NumberField label="Line height" short="LH" value={p.lineHeight} min={0.5} max={4} step={0.05} decimals={2} onChange={(v) => setProp("lineHeight", v)} />
          <NumberField
            label="Letter spacing"
            short="LS"
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
      <Section title="COLOR">
        <ColorField label="Text color" value={p.color} swatches={SWATCHES} onChange={(color) => setProp("color", color)} />
      </Section>
    </>
  );
}

function ShapeProperties({ element, update }: { element: ShapeElement; update: Update }) {
  const p = element.properties;
  return (
    <Section title="FILL">
      <ColorField label="Fill color" value={p.fill} swatches={SWATCHES} onChange={(fill) => update({ properties: { fill } }, "fill")} />
      {p.shape === "rect" && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <NumberField label="Corner radius" short="R" value={p.radius} min={0} max={1000} onChange={(radius) => update({ properties: { radius } }, "radius")} />
        </div>
      )}
    </Section>
  );
}

function ImageProperties({ element, update }: { element: ImageElement; update: Update }) {
  const assets = useEditor((s) => s.assets);
  const [replacing, setReplacing] = useState(false);
  return (
    <Section title="IMAGE">
      <Segmented
        label="Image fit"
        value={element.properties.fit}
        options={[
          { value: "cover", label: "Fill" },
          { value: "contain", label: "Fit" },
        ]}
        onChange={(fit) => update({ properties: { fit } }, "fit")}
      />
      <Button variant="secondary" size="sm" className="mt-2 w-full p-2 text-xs" onClick={() => setReplacing((r) => !r)} aria-expanded={replacing}>
        Replace image
      </Button>
      {replacing &&
        (assets.length === 0 ? (
          <p className="mt-2 text-[11.5px] text-muted-2">Upload images from the Uploads panel first.</p>
        ) : (
          <ul className="mt-2 grid grid-cols-3 gap-1.5" aria-label="Replace with">
            {assets.map((asset) => (
              <li key={asset.key}>
                <button
                  aria-label={`Use ${asset.filename}`}
                  onClick={() => {
                    update({ properties: { assetKey: asset.key, imageUrl: asset.url } }, "asset");
                    setReplacing(false);
                  }}
                  className="block aspect-square w-full overflow-hidden rounded-md border border-line hover:border-accent"
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
      <Section title="POSITION & SIZE">
        <div className="grid grid-cols-2 gap-2">
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
        {autoHeight && <p className="mt-1.5 text-[10.5px] text-muted-3">Text height follows its content.</p>}
      </Section>

      <Section title="TRANSFORM">
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

      <Section title="ARRANGE">
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
      <Section title="PAGE SIZE">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Page width" short="W" value={page.width} disabled onChange={() => undefined} />
          <NumberField label="Page height" short="H" value={page.height} disabled onChange={() => undefined} />
        </div>
      </Section>
      {!page.backgroundImageKey && (
        <Section title="BACKGROUND">
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
  const badge = element ? element.type : many ? "GROUP" : "PAGE";

  return (
    <aside className="w-[250px] shrink-0 overflow-auto border-l border-line bg-surface p-4 max-md:hidden" aria-label="Properties">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="truncate text-[12.5px] font-semibold">{title}</h2>
        <TypeBadge className="ml-auto">{badge}</TypeBadge>
      </div>

      {element && <ElementProperties key={element.id} element={element} />}
      {!element && !many && <PageProperties />}
      {(many || element) && (
        <Section title={many ? "ALIGN" : "ALIGN TO PAGE"}>
          <AlignButtons />
        </Section>
      )}

      <div className="mt-[22px] flex gap-2 border-t border-[#F0ECE3] pt-3.5">
        <Button variant="secondary" size="sm" className="flex-1 p-2 text-xs" onClick={duplicate}>
          {selected.length === 0 ? "Duplicate page" : "Duplicate"}
        </Button>
        <Button variant="danger" size="sm" className="flex-1 p-2 text-xs" onClick={remove} disabled={selected.length === 0 && pageCount === 1}>
          {selected.length === 0 ? "Delete page" : "Delete"}
        </Button>
      </div>
    </aside>
  );
}
