"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageCanvas } from "@/components/flipbook/page-canvas";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
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

const ACCENTS = ["#2B3AE8", "#C0392B", "#1F7A4D", "#B86E00", "#111111"];
const GROUNDS = ["#1C1C1E", "#F1F2F4", "#26303F"];

type ToggleKey = Exclude<keyof Settings, "backgroundColor" | "accentColor">;

const TOGGLES: { key: ToggleKey; label: string; sub: string }[] = [
  { key: "showLogo", label: "Show your logo", sub: "Top-left of the viewer" },
  { key: "showShare", label: "Share button", sub: "Copy link, social targets" },
  { key: "showDownload", label: "Allow PDF download", sub: "Readers can save the file · Pro" },
  { key: "showFullscreen", label: "Fullscreen button", sub: "Expands the spread" },
  { key: "showThumbnails", label: "Thumbnail strip", sub: "Jump to any page" },
  { key: "showBranding", label: "Made with Flipbook", sub: "Pro can hide it" },
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
      className={cn("ml-auto flex items-center gap-1.5 pb-3 pl-3 text-[12.5px] whitespace-nowrap", state.status === "error" ? "text-danger" : "text-muted")}
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
    <div className="flex flex-wrap items-center gap-2.5" role="radiogroup" aria-label={label}>
      {colors.map((c) => (
        <button
          key={c}
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn(
            "size-8 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.1)]",
            value === c && "shadow-[inset_0_0_0_1px_rgba(0,0,0,.1),0_0_0_2px_#fff,0_0_0_3.5px_var(--color-accent)]",
          )}
          style={{ background: c }}
        />
      ))}
      <span className="ml-1 text-[13px] text-muted tabular-nums">{value}</span>
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
  const dim = dark ? "text-faint" : "text-muted";
  const chip = cn("rounded-full px-[9px] py-[3px] text-[10px] whitespace-nowrap", fg);

  return (
    <div data-testid="viewer-preview" className="flex flex-col gap-3.5 p-[18px]" style={{ background: settings.backgroundColor }}>
      <div className="flex items-center gap-2">
        {settings.showLogo && <span className="block size-3.5 shrink-0 rounded-[4px]" style={{ background: settings.accentColor }} />}
        <span className={cn("min-w-0 flex-1 truncate font-serif text-sm", fg)}>{title}</span>
        {settings.showDownload && <span className={chip}>PDF</span>}
        {settings.showFullscreen && <span className={chip}>⤢</span>}
        {settings.showShare && (
          <span className={cn("rounded-full px-[9px] py-[3px] text-[10px] font-semibold", dark ? "bg-on-dark text-ink" : "bg-ink text-white")}>Share</span>
        )}
      </div>
      <div className="flex w-full shadow-[0_10px_26px_rgba(0,0,0,.3)]">
        {pages.length > 0 ? (
          pages.map((page) => <PageCanvas key={page.id} page={page} className="w-1/2" />)
        ) : (
          <>
            <div className="aspect-[3/4] w-1/2 bg-on-dark" />
            <div className="aspect-[3/4] w-1/2 bg-canvas" />
          </>
        )}
      </div>
      <div className="flex items-center justify-center gap-2.5">
        {settings.showThumbnails && (
          <span className={cn("block h-2 w-[60px] rounded-[2px]", dark ? "bg-[rgba(242,242,240,.25)]" : "bg-ink/15")} />
        )}
        <span className={cn("text-[10.5px] tabular-nums", dim)}>
          {pages.length > 0 ? (
            <>
              <b className={cn("font-semibold", fg)}>{pages.map((p) => p.pageNumber).join("–")}</b> of {pageCount}
            </>
          ) : (
            "No pages yet"
          )}
        </span>
      </div>
      {settings.showBranding && (
        <div className={cn("-mt-1.5 text-center text-[10px]", dim)}>
          Made with <span className={cn("font-serif italic", fg)}>Flipbook</span>
        </div>
      )}
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
  canOfferDownload,
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
  canOfferDownload: boolean;
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
    const result = await deleteFlipbookAction(flipbook.id, { redirectTo: "/dashboard" });
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

  const tile = "flex min-w-0 flex-[1_1_150px] flex-col gap-[3px] px-4 py-3.5 text-left";
  const chip = "inline-flex h-[30px] items-center rounded-full border border-line-2 px-3.5 text-[13px] whitespace-nowrap text-ink hover:border-ink";

  return (
    <div className="flex max-w-[1240px] flex-col">
      <div className="flex flex-wrap items-end gap-5">
        <div className="flex min-w-0 flex-col gap-2">
          <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
            <Link href="/dashboard" className="hover:text-ink">
              Flipbooks
            </Link>{" "}
            / Settings
          </nav>
          <h1 className="font-serif text-[40px] leading-none tracking-[-1.2px] break-words md:text-[52px] md:tracking-[-1.6px]">
            {title || "Untitled flipbook"}
          </h1>
        </div>
        <div className="ml-auto flex gap-2.5">
          <ButtonLink href={`/f/${savedSlug}`} variant="outline">
            Preview
          </ButtonLink>
          {pageCount > 0 && (
            <ButtonLink href={`/dashboard/flipbooks/${flipbook.id}/editor`} variant="outline">
              Open editor
            </ButtonLink>
          )}
          {flipbook.status === "PUBLISHED" || pageCount === 0 ? (
            <Button variant="primary" onClick={() => selectTab("share")}>
              Share
            </Button>
          ) : (
            <Button variant="primary" onClick={publish} disabled={busy !== null}>
              {busy === "publish" ? "Publishing…" : "Publish"}
            </Button>
          )}
        </div>
      </div>
      {flipbook.status === "FAILED" && flipbook.type === "PDF" && (
        <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 bg-danger-bg px-4 py-3 text-[13.5px] text-danger-ink">
          <span className="min-w-0 flex-1">
            <span className="font-bold">Processing failed</span>
            {flipbook.error ? ` · ${flipbook.error}` : ""}. Retry, or delete it and upload the PDF again.
          </span>
          <Button variant="danger" size="sm" onClick={retry} disabled={retrying}>
            {retrying ? "Queued…" : "Retry processing"}
          </Button>
        </div>
      )}
      {(flipbook.status === "PROCESSING" || flipbook.status === "UPLOADING") && (
        <p role="status" className="mt-6 bg-warning-bg px-4 py-3 text-[13.5px] text-warning">
          <span className="font-semibold">Rendering pages…</span> You can already change the settings; the preview fills in when it is done.
        </p>
      )}
      {actionError && (
        <p role="alert" className="mt-4 text-[13px] text-danger">
          {actionError}
        </p>
      )}

      <div className="mt-7 flex gap-7 overflow-x-auto border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => selectTab(t.value)}
            className={cn(
              "pb-3 text-sm",
              tab === t.value ? "font-semibold text-accent shadow-[inset_0_-2px_0_var(--color-accent)]" : "text-ink hover:text-accent",
            )}
          >
            {t.label}
          </button>
        ))}
        <SaveIndicator state={autosave.state} />
      </div>

      <div className="grid gap-14 pt-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-[26px]">
          {tab === "general" && (
            <>
              <Field label="Title" htmlFor="title">
                <input
                  id="title"
                  value={title}
                  maxLength={120}
                  placeholder="Untitled flipbook"
                  aria-invalid={!title.trim() || undefined}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (e.target.value.trim()) autosave.queue({ title: e.target.value.trim() });
                  }}
                  className="input-line aria-invalid:border-danger"
                />
                {!title.trim() && <p className="mt-1.5 text-[12.5px] text-danger">Give it a title.</p>}
              </Field>
              <Field
                label="Public address"
                htmlFor="slug"
                hintTone={slugMessage ? "danger" : slugChecked ? "success" : "muted"}
                hint={slugMessage ? (slugServerProblem === "That address is taken." ? "Taken" : "Invalid") : slugChecked ? "Available" : "Checking…"}
              >
                <div className="flex h-11 items-center border-b-[1.5px] border-ink text-[15px] focus-within:border-ink has-disabled:border-b has-disabled:border-line-2">
                  <span className="whitespace-nowrap text-faint">{host}/f/</span>
                  <input
                    id="slug"
                    value={slug}
                    disabled={!canUseCustomSlug}
                    maxLength={80}
                    onChange={(e) => changeSlug(e.target.value)}
                    onBlur={commitSlug}
                    onKeyDown={(e) => e.key === "Enter" && commitSlug()}
                    className="h-full min-w-0 flex-1 bg-transparent outline-none focus-visible:outline-none disabled:text-muted"
                  />
                </div>
                <p className={cn("mt-1.5 text-[12.5px]", slugMessage ? "text-danger" : "text-muted")}>
                  {slugMessage ??
                    (canUseCustomSlug ? "Changing the address breaks links you have already shared." : "Custom addresses are part of Pro.")}
                </p>
              </Field>
              <Field label="Description" htmlFor="description" hint={`${description.length} / ${DESCRIPTION_MAX}`}>
                <textarea
                  id="description"
                  value={description}
                  maxLength={DESCRIPTION_MAX}
                  placeholder="What is this flipbook about?"
                  onChange={(e) => {
                    setDescription(e.target.value);
                    autosave.queue({ description: e.target.value });
                  }}
                  className="input-line h-auto min-h-11 resize-y py-2.5 leading-[1.45]"
                />
                <p className="mt-1.5 text-[12.5px] text-muted">Used for search engines and link previews.</p>
              </Field>
              <div className="flex flex-col gap-2.5">
                <span className="text-[13px] font-semibold" id="visibility-label">
                  Who can read it
                </span>
                <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-labelledby="visibility-label">
                  {VISIBILITY.map((v) => (
                    <button
                      key={v.value}
                      role="radio"
                      aria-checked={visibility === v.value}
                      onClick={() => {
                        setVisibility(v.value);
                        autosave.queue({ visibility: v.value });
                      }}
                      className={cn(tile, visibility === v.value ? "border-[1.5px] border-ink" : "border border-line-2 hover:border-ink")}
                    >
                      <span className={cn("text-sm", visibility === v.value && "font-semibold")}>{v.label}</span>
                      <span className="text-[12.5px] leading-[1.4] whitespace-normal text-muted">{v.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
                <div className="min-w-[200px] flex-1">
                  <div className="text-sm font-semibold text-danger">Delete flipbook</div>
                  <div className="mt-0.5 text-[12.5px] text-muted">Removes pages, images and analytics. Can&apos;t be undone.</div>
                </div>
                {confirmDelete ? (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={busy === "delete"}>
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
            <>
              <div className="flex flex-col gap-3">
                <div className="text-[13px] font-semibold">Accent color</div>
                <Swatches colors={ACCENTS} value={settings.accentColor} onChange={(c) => update({ accentColor: c })} label="Accent color" />
              </div>
              <div className="flex flex-col gap-3">
                <div className="text-[13px] font-semibold">Reader background</div>
                <Swatches colors={GROUNDS} value={settings.backgroundColor} onChange={(c) => update({ backgroundColor: c })} label="Reader background" />
              </div>
              <div>
                <h2 className="font-serif text-[24px] leading-tight tracking-[-0.5px]">Reader controls</h2>
                <p className="mt-1 mb-3 text-[13px] text-muted">What readers see around the pages.</p>
                <div className="flex flex-col border-b border-line">
                  {TOGGLES.map((t) => {
                    const locked = (t.key === "showBranding" && !canRemoveBranding) || (t.key === "showDownload" && !canOfferDownload);
                    return (
                      <div key={t.key} className="flex min-h-[58px] items-center gap-3 border-t border-line py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm">{t.label}</div>
                          <div className="mt-0.5 text-[12.5px] text-muted">{t.sub}</div>
                        </div>
                        <Switch
                          label={t.label}
                          checked={settings[t.key]}
                          disabled={locked}
                          onCheckedChange={(checked) => update({ [t.key]: checked })}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === "share" && (
            <>
              <div className="flex flex-col gap-3">
                <div className="text-[13px] font-semibold">Public link</div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex h-11 min-w-0 flex-[1_1_240px] items-center truncate border-b-[1.5px] border-ink text-[15px]">{publicUrl}</div>
                  <Button variant="primary" onClick={() => copy("link", publicUrl)}>
                    {copied === "link" ? "Copied" : "Copy link"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {shareTargets.map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className={chip}>
                      {s.label}
                    </a>
                  ))}
                  <button className={chip}>QR code</button>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="text-[13px] font-semibold">Embed</div>
                {/* The only mono text in the app. */}
                <pre className="overflow-auto bg-ink px-5 py-4 font-mono text-[12.5px] leading-[1.7] whitespace-pre text-line-2">{embedCode}</pre>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => copy("embed", embedCode)}>
                    {copied === "embed" ? "Copied" : "Copy code"}
                  </Button>
                  <Button variant="outline">WordPress shortcode</Button>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t border-line pt-5">
                <div className="text-[13px] font-semibold">Link preview</div>
                <div className="flex gap-3.5 overflow-hidden border border-line">
                  <div className="w-[118px] shrink-0 bg-canvas" />
                  <div className="min-w-0 py-3.5 pr-4">
                    <div className="text-[12px] text-muted">{host}</div>
                    <div className="mt-1 font-serif text-[18px] leading-tight">{title}</div>
                    <div className="mt-1 text-[13px] leading-normal text-muted">{description}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <aside aria-label="What readers see" className="flex min-w-0 flex-col gap-3 self-start lg:sticky lg:top-11">
          <span className="text-[13px] text-muted">What readers see</span>
          <LiveViewerPreview title={title} settings={settings} pages={previewPages} pageCount={pageCount} />
          <p className="text-[12.5px] leading-normal text-muted">
            {canRemoveBranding ? (
              "Pro lets you remove the Flipbook badge."
            ) : (
              <>
                <Link href="/dashboard/billing?upgrade=branding" className="font-semibold text-accent underline underline-offset-[3px] hover:text-ink">
                  Upgrade to Pro
                </Link>{" "}
                to remove the Flipbook badge.
              </>
            )}
          </p>
        </aside>
      </div>
    </div>
  );
}
