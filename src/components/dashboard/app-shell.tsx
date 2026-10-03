"use client";

import {
  BookOpen,
  ChartNoAxesColumn,
  ChevronsUpDown,
  CreditCard,
  LayoutTemplate,
  LogOut,
  Menu,
  Plus,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { Logo } from "@/components/ui/logo";
import { Meter } from "@/components/ui/meter";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: LucideIcon; isActive: (path: string) => boolean };

const isAnalyticsPath = (path: string) => /^\/dashboard\/(analytics|flipbooks\/[^/]+\/analytics)/.test(path);

const NAV: NavItem[] = [
  {
    label: "Flipbooks",
    href: "/dashboard",
    icon: BookOpen,
    isActive: (p) => p === "/dashboard" || (p.startsWith("/dashboard/flipbooks") && !isAnalyticsPath(p)),
  },
  { label: "Templates", href: "/dashboard/templates", icon: LayoutTemplate, isActive: (p) => p === "/dashboard/templates" },
  { label: "Analytics", href: "/dashboard/analytics", icon: ChartNoAxesColumn, isActive: isAnalyticsPath },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard, isActive: (p) => p === "/dashboard/billing" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, isActive: (p) => p === "/dashboard/settings" },
];

export type ShellUser = { name: string; email: string; initials: string; emailVerified: boolean };
export type ShellStorage = { used: string; limit: string; ratio: number; planLabel: string };

/** Sign-out lives in a small menu on the user row. */
function UserMenu({ user, planLabel }: { user: ShellUser; planLabel: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const signOut = async () => {
    setPending(true);
    await authClient.signOut();
    // A full page load drops the client router cache, so Back can't show signed-in pages.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard navigation
    window.location.assign("/login");
  };
  const item = "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13.5px] hover:bg-hover";

  return (
    <div
      className="relative"
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 border-t border-line pt-4 text-left"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-tint text-xs font-bold text-accent">
          {user.initials}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13.5px] font-semibold">{user.name}</span>
          <span className="truncate text-xs text-muted">{planLabel}</span>
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-55" strokeWidth={1.6} />
      </button>
      {open && (
        <div role="menu" className="absolute bottom-full left-0 z-50 mb-2 w-full bg-surface p-1 shadow-menu">
          <div className="truncate px-2.5 pt-1.5 pb-2 text-xs text-muted">{user.email}</div>
          <button role="menuitem" className={item} disabled={pending} onClick={signOut}>
            <LogOut className="size-4 opacity-60" strokeWidth={1.6} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** Shown until the email is verified: publishing needs a verified address. */
function VerifyEmailBanner({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const resend = async () => {
    setState("sending");
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" });
    setState(error ? "error" : "sent");
  };
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-warning-bg px-4 py-2.5 text-[13px] text-warning md:px-14">
      <span>
        <span className="font-semibold">Verify your email to publish.</span> We sent a link to {email}.
      </span>
      <button onClick={resend} disabled={state === "sending" || state === "sent"} className="font-semibold underline underline-offset-2 disabled:no-underline">
        {state === "sent" ? "Link sent" : state === "error" ? "Couldn't send, try again" : state === "sending" ? "Sending…" : "Resend link"}
      </button>
    </div>
  );
}

function Sidebar({
  user,
  storage,
  flipbookCount,
  pathname,
  onNavigate,
}: {
  user: ShellUser;
  storage: ShellStorage;
  flipbookCount: number;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <>
      <Link href="/dashboard" onClick={onNavigate} className="self-start px-2.5" aria-label="Flipbook dashboard">
        <Logo />
      </Link>
      <ButtonLink href="/dashboard/flipbooks/new" onClick={onNavigate} className="mt-[26px] w-full">
        <Plus className="size-[15px]" strokeWidth={1.8} />
        New flipbook
      </ButtonLink>

      <nav className="mt-[22px] flex flex-col gap-0.5" aria-label="Workspace">
        {NAV.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-[38px] w-full items-center gap-3 rounded-[10px] px-3 text-sm",
                active ? "bg-accent-tint font-semibold text-accent" : "text-ink hover:bg-hover",
              )}
            >
              <Icon className={cn("size-4", !active && "opacity-55")} strokeWidth={1.6} />
              <span>{item.label}</span>
              {item.label === "Flipbooks" && <span className="ml-auto text-xs font-normal text-faint tabular-nums">{flipbookCount}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-4 px-2.5">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between gap-2 text-[12.5px]">
            <span className="text-muted">Storage</span>
            <span>
              {storage.used} of {storage.limit} GB
            </span>
          </div>
          <Meter value={storage.ratio} label="Storage used" />
        </div>
        <UserMenu user={user} planLabel={storage.planLabel} />
      </div>
    </>
  );
}

export function AppShell({
  user,
  storage,
  flipbookCount,
  children,
}: {
  user: ShellUser;
  storage: ShellStorage;
  flipbookCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen items-stretch">
      {/* Desktop: sticky sidebar. Below md: off-canvas drawer behind a slim top bar. */}
      <aside
        className={cn(
          "z-40 flex h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-4 pt-[26px] pb-5",
          "fixed inset-y-0 left-0 md:sticky md:top-0",
          drawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <Sidebar
          user={user}
          storage={storage}
          flipbookCount={flipbookCount}
          pathname={pathname}
          onNavigate={() => setDrawerOpen(false)}
        />
      </aside>
      {drawerOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-ink/45 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-paper px-4 md:hidden">
          <button
            aria-label="Open menu"
            className="-ml-1 flex size-9 items-center justify-center rounded-full border border-line-2"
            onClick={() => setDrawerOpen(true)}
          >
            {drawerOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <Logo className="text-[24px]" />
        </header>

        {!user.emailVerified && <VerifyEmailBanner email={user.email} />}

        <div className="flex-1 px-4 pt-8 pb-16 md:px-14 md:pt-11">{children}</div>
      </main>
    </div>
  );
}
