"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageCanvas } from "@/components/flipbook/page-canvas";
import { Button, ButtonLink } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  checkSlugAction,
  deleteFlipbookAction,
  publishFlipbookAction,
  updateFlipbookAction,
  updateSlugAction,
} from "@/lib/actions/flipbooks";
import { retryProcessingAction } from "@/lib/actions/uploads";
import { DESCRIPTION_MAX, slugProblem } from "@/lib/flipbook-rules";
import type { FlipbookStatus, FlipbookType, FlipbookSettings as Settings, Page, Visibility } from "@/lib/types";
import { cn, isDarkColor } from "@/lib/utils";
import type { FlipbookPatch } from "@/lib/validation";

export type SettingsTab = "general" | "branding" | "share";

const TABS: { value: SettingsTab; label: string }[] = [
  { value: "general", label: "General" },
  { value: "branding", label: "Branding" },
  { value: "share", label: "Share & embed" },
];

const VISIBILITY: { value: Visibility; label: string; sub: string }[] = [
  { value: "PUBLIC", label: "Public", sub: "Anyone with the link" },
  { value: "UNLISTED", label: "Unlisted", sub: "Hidden from search" },
  { value: "PRIVATE", label: "Private", sub: "Only you" },
];

const ACCENTS = ["#1B45D6", "#C0392B", "#1C7A52", "#C98A15", "#17150F"];
const GROUNDS = ["#17150F", "#F3F1EC", "#26303F"];

type ToggleKey = Exclude<keyof Settings, "backgroundColor" | "accentColor">;

const TOGGLES: { key: ToggleKey; label: string; sub: string }[] = [
  { key: "showLogo", label: "Show your logo", sub: "Top-left of the viewer" },
  { key: "showShare", label: "Share button", sub: "Copy link, social targets" },
  { key: "showDownload", label: "Allow PDF download", sub: "Readers can save the file" },
  { key: "showFullscreen", label: "Fullscreen button", sub: "Expands the spread" },
  { key: "showThumbnails", label: "Thumbnail strip", sub: "Jump to any page" },
  { key: "showBranding", label: "Powered by Flipbook", sub: "Lifetime plan can hide it" },
];

const SAVE_DELAY = 700;
const SLUG_CHECK_DELAY = 350;

type SaveState = { status: "idle" | "saving" | "saved" | "error"; error?: string };

/**
 * Settings save as you edit (the design has no save button). Changes made within
 * SAVE_DELAY are batched into one server action call.
 */
function useSettingsAutosave(id: string) {
  const [state, setState] = useState<SaveState>({ status: "idle" });
  const pending = useRef<FlipbookPatch>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flush = async () => {
    const patch = pending.current;
    pending.current = {};
    const result = await updateFlipbookAction(id, patch);
    setState(result.ok ? { status: "saved" } : { status: "error", error: result.error });
  };

  const queue = (patch: FlipbookPatch) => {
    pending.current = { ...pending.current, ...patch };
    setState({ status: "saving" });
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  };

  // Leaving the page mid-debounce still sends the last edit.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (Object.keys(pending.current).length > 0) void updateFlipbookAction(id, pending.current);
    },
    [id],
  );

  return { state, setState, queue };
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state.status === "idle") return null;
  const label = state.status === "saving" ? "Saving…" : state.status === "saved" ? "Saved" : state.error;
  return (
    <span
      aria-live="polite"
      className={cn("ml-auto flex items-center gap-1.5 self-center pl-3 text-[11.5px] whitespace-nowrap", state.status === "error" ? "text-danger" : "text-muted")}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          state.status === "saving" ? "bg-warning" : state.status === "saved" ? "bg-success" : "bg-danger",
        )}
      />
      {label}
    </span>
  );
}

const fieldClass = "w-full rounded-[9px] border border-line bg-surface px-3 py-2.5 text-[13px] outline-none focus:border-ink";

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1500);
  };
  return { copied, copy };
}

function Swatches({
  colors,
  value,
  onChange,
  label,
}: {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-[9px]" role="radiogroup" aria-label={label}>
      {colors.map((c) => (
        <button
          key={c}
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn(
            "size-[30px] rounded-[9px]",
            value === c ? "border-2 border-ink shadow-[inset_0_0_0_2px_#fff]" : "border border-[rgba(23,21,15,.12)]",
          )}
          style={{ background: c }}
        />
      ))}
      <span className="font-mono text-[11.5px] font-medium text-muted">{value}</span>
    </div>
  );
}

function LiveViewerPreview({
  title,
  settings,
  pages,
  pageCount,
}: {
  title: string;
  settings: Settings;
  pages: Page[];
  pageCount: number;
}) {
  const dark = isDarkColor(settings.backgroundColor);
  const fg = dark ? "text-on-dark" : "text-ink";
  const dim = dark ? "text-on-dark-dim-2" : "text-muted-2";
  const chip = cn("rounded-[14px] border px-2 py-[3px] text-[10px] whitespace-nowrap", fg, dark ? "border-line-dark" : "border-[#D8D2C4]");

  return (
    <div data-testid="viewer-preview" className="p-[18px]" style={{ background: settings.backgroundColor }}>
      <div className="mb-3 flex items-center gap-2">
        {settings.showLogo && (
          <span className="block size-[18px] shrink-0 rounded-[5px]" style={{ background: settings.accentColor }} />
        )}
        <span className={cn("min-w-0 flex-1 truncate text-xs font-semibold", fg)}>{title}</span>
        {settings.showShare && <span className={chip}>Share</span>}
        {settings.showDownload && <span className={chip}>PDF</span>}
        {settings.showFullscreen && <span className={chip}>⤢</span>}
      </div>
      <div className="flex w-full shadow-[0_10px_26px_rgba(0,0,0,.35)]">
        {pages.length > 0 ? (
          pages.map((page) => <PageCanvas key={page.id} page={page} className="w-1/2" />)
        ) : (
          <>
            <div className="aspect-[3/4] w-1/2 bg-on-dark" />
            <div className="aspect-[3/4] w-1/2 bg-paper-2" />
          </>
        )}
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        {settings.showThumbnails && (
          <span className={cn("block h-3 w-16 rounded-[3px]", dark ? "bg-[rgba(246,244,239,.28)]" : "bg-[rgba(23,21,15,.14)]")} />
        )}
        <span className={cn("font-mono text-[10px] font-medium", dim)}>
          {pages.length > 0 ? `${pages.map((p) => p.pageNumber).join("–")} / ${pageCount}` : "No pages yet"}
        </span>
      </div>
      {settings.showBranding && <div className={cn("mt-2.5 text-center text-[9.5px]", dim)}>Powered by Flipbook</div>}
    </div>
  );
}

export function FlipbookSettings({
  flipbook,
  previewPages,
  pageCount,
  publicUrlBase,
  embedUrl,
  canRemoveBranding,
  canUseCustomSlug,
  initialTab,
}: {
  flipbook: {
    id: string;
    title: string;
    slug: string;
    description: string;
    visibility: Visibility;
    status: FlipbookStatus;
    type: FlipbookType;
    error: string | null;
    settings: Settings;
  };
  previewPages: Page[];
  pageCount: number;
  /** e.g. "https://flipbook.co" */
  publicUrlBase: string;
  embedUrl: string;
  canRemoveBranding: boolean;
  canUseCustomSlug: boolean;
  initialTab: SettingsTab;
}) {
  const [tab, setTab] = useState(initialTab);
  const [title, setTitle] = useState(flipbook.title);
  const [slug, setSlug] = useState(flipbook.slug);
  const [savedSlug, setSavedSlug] = useState(flipbook.slug);
  const [slugCheck, setSlugCheck] = useState<{ slug: string; problem: string | null } | null>(null);
  const [description, setDescription] = useState(flipbook.description);
  const [visibility, setVisibility] = useState(flipbook.visibility);
  const [settings, setSettings] = useState(flipbook.settings);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<"publish" | "delete" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { copied, copy } = useCopy();
  const autosave = useSettingsAutosave(flipbook.id);
  const slugTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const host = new URL(publicUrlBase).host;
  const publicUrl = `${publicUrlBase}/f/${savedSlug}`;
  // Local format problems show instantly; availability comes from the server check.
  const slugLocalProblem = slug === savedSlug ? null : slugProblem(slug);
  const slugServerProblem = slugCheck?.slug === slug ? slugCheck.problem : null;
  const slugMessage = slugLocalProblem ?? slugServerProblem;
  const slugChecked = slug === savedSlug || (slugCheck?.slug === slug && !slugCheck.problem);

  const changeSlug = (value: string) => {
    const next = value.toLowerCase();
    setSlug(next);
    clearTimeout(slugTimer.current);
    if (next === savedSlug || slugProblem(next)) return;
    slugTimer.current = setTimeout(async () => {
      const result = await checkSlugAction(flipbook.id, next);
      setSlugCheck({ slug: next, problem: result.problem });
    }, SLUG_CHECK_DELAY);
  };

  const commitSlug = async () => {
    if (slug === savedSlug || slugMessage) return;
    autosave.setState({ status: "saving" });
    const result = await updateSlugAction(flipbook.id, slug);
    if (result.ok) {
      setSavedSlug(slug);
      autosave.setState({ status: "saved" });
    } else {
      setSlugCheck({ slug, problem: result.error });
      autosave.setState({ status: "error", error: result.error });
    }
  };

  const publish = async () => {
    setBusy("publish");
    setActionError(null);
    const result = await publishFlipbookAction(flipbook.id);
    // On success the action redirects to the public page.
    if (result && !result.ok) setActionError(result.error);
    setBusy(null);
  };

  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    const result = await retryProcessingAction(flipbook.id);
    if (!result.ok) setActionError(result.error);
    setRetrying(false);
    router.refresh();
  };

  const remove = async () => {
    setBusy("delete");
    const result = await deleteFlipbookAction(flipbook.id, { redirectTo: "/dashboard/flipbooks" });
    if (result && !result.ok) {
      setActionError(result.error);
      setBusy(null);
    }
  };
  const embedCode = `<iframe\n  src="${embedUrl}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  loading="lazy">\n</iframe>`;
  const shareText = encodeURIComponent(title);
  const shareUrl = encodeURIComponent(publicUrl);
  const shareTargets = [
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}` },
    { label: "X", href: `https://x.com/intent/post?url=${shareUrl}&text=${shareText}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${shareText}%20${shareUrl}` },
    { label: "Email", href: `mailto:?subject=${shareText}&body=${shareUrl}` },
  ];

  const selectTab = (next: SettingsTab) => {
    setTab(next);
    window.history.replaceState(null, "", `?tab=${next}`);
  };
  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    autosave.queue({ settings: next });
  };

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-[18px]">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <div className="label-mono text-muted-2">SETTINGS</div>
          <h1 className="mt-1.5 font-serif text-[30px] leading-[1.1] tracking-[-0.5px]">{title || "Untitled flipbook"}</h1>
        </div>
        <div className="ml-auto flex gap-2">
          <ButtonLink href={`/f/${savedSlug}`} variant="secondary">
            Preview
          </ButtonLink>
          {flipbook.status === "PUBLISHED" || pageCount === 0 ? (
            <Button onClick={() => selectTab("share")}>Share</Button>
          ) : (
            <Button variant="accent" onClick={publish} disabled={busy !== null}>
              {busy === "publish" ? "Publishing…" : "Publish"}
            </Button>
          )}
        </div>
      </div>
      {flipbook.status === "FAILED" && flipbook.type === "PDF" && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-danger-line bg-danger-tint px-4 py-3 text-[12.5px] text-danger">
          <span className="min-w-0 flex-1">
            <span className="font-semibold">Processing failed</span>
            {flipbook.error ? ` · ${flipbook.error}` : ""}. Retry, or delete it and upload the PDF again.
          </span>
          <Button variant="danger" onClick={retry} disabled={retrying}>
            {retrying ? "Queued…" : "Retry processing"}
          </Button>
        </div>
      )}
      {(flipbook.status === "PROCESSING" || flipbook.status === "UPLOADING") && (
        <p role="status" className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-[12.5px] text-warning-ink">
          <span className="font-semibold">Rendering pages…</span> You can already change the settings; the preview fills in when it is done.
        </p>
      )}
      {actionError && (
        <p role="alert" className="-mt-2 text-[12.5px] text-danger">
          {actionError}
        </p>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => selectTab(t.value)}
            className={cn(
              "-mb-px mr-[18px] border-b-2 px-1 py-2.5 text-[13px]",
              tab === t.value ? "border-ink font-semibold text-ink" : "border-transparent font-medium text-muted-2 hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
        <SaveIndicator state={autosave.state} />
      </div>

      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4">
          {tab === "general" && (
            <>
              <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface px-[22px] py-5">
                <label className="block">
                  <div className="mb-[7px] text-[12.5px] font-semibold">Title</div>
                  <input
                    value={title}
                    maxLength={120}
                    aria-invalid={!title.trim() || undefined}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (e.target.value.trim()) autosave.queue({ title: e.target.value.trim() });
                    }}
                    className={cn(fieldClass, "aria-invalid:border-danger")}
                  />
                  {!title.trim() && <p className="mt-1.5 text-[11px] text-danger">Give it a title.</p>}
                </label>
                <div>
                  <label htmlFor="slug" className="mb-[7px] block text-[12.5px] font-semibold">
                    Public URL
                  </label>
                  <div className="flex items-center overflow-hidden rounded-[9px] border border-line focus-within:border-ink">
                    <span className="py-2.5 pl-3 font-mono text-[12.5px] font-medium whitespace-nowrap text-muted-3">
                      {host}/f/
                    </span>
                    <input
                      id="slug"
                      value={slug}
                      disabled={!canUseCustomSlug}
                      maxLength={80}
                      onChange={(e) => changeSlug(e.target.value)}
                      onBlur={commitSlug}
                      onKeyDown={(e) => e.key === "Enter" && commitSlug()}
                      className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 pl-0.5 font-mono text-[12.5px] font-medium outline-none disabled:text-muted"
                    />
                    <span
                      className={cn(
                        "px-3 text-[11px] whitespace-nowrap",
                        slugMessage ? "text-danger" : slugChecked ? "text-success" : "text-muted-3",
                      )}
                    >
                      {slugMessage ? (slugServerProblem === "That address is taken." ? "Taken" : "Invalid") : slugChecked ? "Available" : "Checking…"}
                    </span>
                  </div>
                  <p className={cn("mt-1.5 text-[11px]", slugMessage ? "text-danger" : "text-muted-2")}>
                    {slugMessage ??
                      (canUseCustomSlug
                        ? "Changing the address breaks links you have already shared."
                        : "Custom addresses are part of the Lifetime Deal.")}
                  </p>
                </div>
                <label className="block">
                  <div className="mb-[7px] text-[12.5px] font-semibold">
                    Description <span className="font-normal text-muted-2">· used for SEO and link previews</span>
                  </div>
                  <textarea
                    value={description}
                    maxLength={DESCRIPTION_MAX}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      autosave.queue({ description: e.target.value });
                    }}
                    className={cn(fieldClass, "min-h-16 resize-y leading-normal text-ink-70")}
                  />
                  <div className="mt-1.5 font-mono text-[10.5px] font-medium text-muted-3">
                    {description.length} / {DESCRIPTION_MAX}
                  </div>
                </label>
                <div>
                  <div className="mb-[9px] text-[12.5px] font-semibold">Visibility</div>
                  <div className="flex flex-wrap gap-[9px]" role="radiogroup" aria-label="Visibility">
                    {VISIBILITY.map((v) => (
                      <button
                        key={v.value}
                        role="radio"
                        aria-checked={visibility === v.value}
                        onClick={() => {
                          setVisibility(v.value);
                          autosave.queue({ visibility: v.value });
                        }}
                        className={cn(
                          "flex min-w-0 flex-[1_1_150px] flex-col gap-[3px] rounded-[10px] border-[1.5px] px-[13px] py-[11px] text-left",
                          visibility === v.value ? "border-ink bg-surface-selected" : "border-line bg-surface hover:border-muted-3",
                        )}
                      >
                        <span className="text-[12.5px] font-semibold">{v.label}</span>
                        <span className="text-[11px] leading-[1.4] text-muted-2">{v.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-danger-line bg-surface px-[22px] py-[18px]">
                <div className="min-w-[200px] flex-1">
                  <div className="text-[12.5px] font-semibold text-danger">Delete flipbook</div>
                  <div className="mt-[3px] text-[11.5px] text-muted-2">Removes pages, assets and analytics. Cannot be undone.</div>
                </div>
                {confirmDelete ? (
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={busy === "delete"}>
                      Cancel
                    </Button>
                    <Button variant="danger" className="border-danger bg-danger text-white hover:bg-danger/90" onClick={remove} disabled={busy === "delete"}>
                      {busy === "delete" ? "Deleting…" : "Confirm delete"}
                    </Button>
                  </div>
                ) : (
                  <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                    Delete
                  </Button>
                )}
              </div>
            </>
          )}

          {tab === "branding" && (
            <div className="flex flex-col gap-[18px] rounded-2xl border border-line bg-surface px-[22px] py-5">
              <div>
                <div className="mb-2.5 text-[12.5px] font-semibold">Accent color</div>
                <Swatches colors={ACCENTS} value={settings.accentColor} onChange={(c) => update({ accentColor: c })} label="Accent color" />
              </div>
              <div>
                <div className="mb-2.5 text-[12.5px] font-semibold">Viewer background</div>
                <Swatches
                  colors={GROUNDS}
                  value={settings.backgroundColor}
                  onChange={(c) => update({ backgroundColor: c })}
                  label="Viewer background"
                />
              </div>
              <div>
                <div className="mb-1 text-[12.5px] font-semibold">Viewer controls</div>
                <div className="mb-3 text-[11.5px] text-muted-2">What readers see around the pages.</div>
                <div className="flex flex-col">
                  {TOGGLES.map((t) => {
                    const locked = t.key === "showBranding" && !canRemoveBranding;
                    return (
                      <div key={t.key} className="flex items-center gap-3 border-t border-line-soft py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-medium">{t.label}</div>
                          <div className="mt-0.5 text-[11px] text-muted-2">{t.sub}</div>
                        </div>
                        <Switch
                          label={t.label}
                          checked={settings[t.key]}
                          color={settings.accentColor}
                          disabled={locked}
                          onCheckedChange={(checked) => update({ [t.key]: checked })}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === "share" && (
            <div className="flex flex-col gap-[18px] rounded-2xl border border-line bg-surface px-[22px] py-5">
              <div>
                <div className="mb-2 text-[12.5px] font-semibold">Public link</div>
                <div className="flex flex-wrap gap-2">
                  <div className="min-w-0 flex-[1_1_240px] truncate rounded-[9px] border border-line px-3 py-2.5 font-mono text-[12.5px] font-medium">
                    {publicUrl}
                  </div>
                  <Button onClick={() => copy("link", publicUrl)} className="px-4 py-2.5">
                    {copied === "link" ? "Copied" : "Copy link"}
                  </Button>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {shareTargets.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-[20px] border border-line bg-surface-sunken px-[13px] py-1.5 text-[11.5px] leading-[1.4] whitespace-nowrap text-ink hover:border-ink hover:text-ink"
                    >
                      {s.label}
                    </a>
                  ))}
                  <button className="rounded-[20px] border border-line bg-surface-sunken px-[13px] py-1.5 text-[11.5px] leading-[1.4] hover:border-ink">
                    QR code
                  </button>
                </div>
              </div>
              <div>
                <div className="mb-2 text-[12.5px] font-semibold">Embed</div>
                <div className="overflow-auto rounded-[10px] bg-ink px-4 py-3.5">
                  <pre className="font-mono text-[11.5px] leading-[1.7] whitespace-pre text-line-strong">{embedCode}</pre>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => copy("embed", embedCode)}>
                    {copied === "embed" ? "Copied" : "Copy code"}
                  </Button>
                  <Button variant="secondary">WordPress shortcode</Button>
                </div>
              </div>
              <div className="border-t border-line-soft pt-4">
                <div className="mb-2 text-[12.5px] font-semibold">Link preview</div>
                <div className="flex gap-3 overflow-hidden rounded-[11px] border border-line">
                  <div className="w-[118px] shrink-0 bg-[linear-gradient(150deg,#E8DFC9,#D2C4A4)]" />
                  <div className="min-w-0 py-[13px] pr-3.5">
                    <div className="font-mono text-[10px] font-medium text-muted-3">{host.toUpperCase()}</div>
                    <div className="mt-[5px] text-[13px] font-semibold">{title}</div>
                    <div className="mt-1 text-[11.5px] leading-normal text-muted">{description}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="sticky top-[90px] min-w-0 flex-[1_1_300px]">
          <div className="label-mono mb-2.5 text-muted-2">LIVE VIEWER PREVIEW</div>
          <div className="overflow-hidden rounded-[14px] border border-line">
            <LiveViewerPreview title={title} settings={settings} pages={previewPages} pageCount={pageCount} />
          </div>
          <p className="mt-2.5 text-[11.5px] leading-normal text-muted-2">
            {canRemoveBranding
              ? "Lifetime plan lets you remove the Flipbook badge."
              : "Upgrade to the Lifetime Deal to remove the Flipbook badge."}
          </p>
        </aside>
      </div>
    </div>
  );
}
