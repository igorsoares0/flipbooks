"use client";

import {
  BookOpen,
  ChartNoAxesColumn,
  CreditCard,
  House,
  Image as ImageIcon,
  LayoutTemplate,
  Menu,
  Plus,
  Search,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Meter } from "@/components/ui/meter";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: LucideIcon; isActive: (path: string) => boolean };

const isAnalyticsPath = (path: string) => /^\/dashboard\/(analytics|flipbooks\/[^/]+\/analytics)/.test(path);

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: House, isActive: (p) => p === "/dashboard" },
  {
    label: "Flipbooks",
    href: "/dashboard/flipbooks",
    icon: BookOpen,
    isActive: (p) => p.startsWith("/dashboard/flipbooks") && !isAnalyticsPath(p),
  },
  { label: "Templates", href: "/dashboard/templates", icon: LayoutTemplate, isActive: (p) => p === "/dashboard/templates" },
  { label: "Assets", href: "/dashboard/assets", icon: ImageIcon, isActive: (p) => p === "/dashboard/assets" },
  { label: "Analytics", href: "/dashboard/analytics", icon: ChartNoAxesColumn, isActive: isAnalyticsPath },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard, isActive: (p) => p === "/dashboard/billing" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, isActive: (p) => p === "/dashboard/settings" },
];

function titleFor(path: string) {
  if (path === "/dashboard") return "Dashboard";
  if (path === "/dashboard/flipbooks/new") return "Create flipbook";
  if (/\/flipbooks\/[^/]+\/settings$/.test(path)) return "Flipbook settings";
  if (isAnalyticsPath(path)) return "Analytics";
  return NAV.find((item) => item.isActive(path))?.label ?? "Dashboard";
}

export type ShellUser = { name: string; email: string; initials: string };
export type ShellStorage = { used: string; limit: string; ratio: number; planLabel: string };

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
      <div className="flex items-center gap-2.5 px-5 pt-[22px] pb-[18px]">
        <Logo />
        <span className="ml-auto rounded border border-line px-[5px] py-0.5 font-mono text-[9px] font-medium text-muted-2">
          LTD
        </span>
      </div>

      <nav className="flex flex-col gap-0.5 px-3 py-1.5">
        <div className="label-mono px-2 pt-2.5 pb-1.5 text-muted-3">WORKSPACE</div>
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
                "flex w-full items-center gap-2.5 rounded-[9px] px-[9px] py-2 text-[12.5px]",
                active ? "bg-surface-alt font-semibold text-ink" : "font-medium text-ink-70 hover:bg-paper",
              )}
            >
              <Icon className="size-[15px] opacity-80" strokeWidth={1.6} />
              <span>{item.label}</span>
              {item.label === "Flipbooks" && (
                <span className="ml-auto rounded-[20px] bg-warning-soft px-1.5 py-0.5 font-mono text-[10px] font-medium text-warning-ink">
                  {flipbookCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4">
        <div className="rounded-xl border border-line bg-surface-sunken px-3.5 py-[13px]">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs font-semibold">Storage</span>
            <span className="font-mono text-[11px] font-medium text-muted">
              {storage.used} / {storage.limit} GB
            </span>
          </div>
          <Meter value={storage.ratio} className="rounded bg-[#E9E5DB]" barClassName="rounded" />
          <div className="mt-[9px] text-[11px] leading-[1.4] text-muted-2">
            {storage.planLabel} · {Math.round(storage.ratio * 100)}% used
          </div>
        </div>
        <div className="mt-3 flex gap-1.5">
          <ButtonLink href="/" variant="secondary" className="flex-1 rounded-lg p-[7px] text-[11px] text-ink-70">
            Site
          </ButtonLink>
          <ButtonLink href="/login" variant="secondary" className="flex-1 rounded-lg p-[7px] text-[11px] text-ink-70">
            Sign out
          </ButtonLink>
        </div>
        <div className="mt-3.5 flex items-center gap-2.5 px-0.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft-2 text-[11.5px] font-semibold text-accent">
            {user.initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-semibold">{user.name}</div>
            <div className="truncate text-[11px] text-muted-2">{user.email}</div>
          </div>
        </div>
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
      {/* Desktop: sticky rail. Below md: off-canvas drawer (the narrow dashboard is not designed yet). */}
      <aside
        className={cn(
          "z-40 flex h-screen w-[236px] shrink-0 flex-col border-r border-line bg-surface",
          "fixed inset-y-0 left-0 transition-none md:sticky md:top-0",
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
          className="fixed inset-0 z-30 bg-ink/30 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[62px] shrink-0 items-center gap-4 border-b border-line bg-[rgba(243,241,236,.85)] px-4 backdrop-blur-[8px] md:px-7">
          <button
            aria-label="Open menu"
            className="-ml-1 flex size-[30px] items-center justify-center rounded-lg border border-line bg-surface md:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            {drawerOpen ? <X className="size-3.5" /> : <Menu className="size-3.5" />}
          </button>
          <div className="truncate text-[15px] font-semibold tracking-[-0.2px]">{titleFor(pathname)}</div>
          <div className="flex-1" />
          <Form
            action="/dashboard/flipbooks"
            className="hidden w-60 min-w-0 flex-[0_1_240px] items-center gap-2 overflow-hidden rounded-[9px] border border-line bg-surface px-[11px] py-[7px] focus-within:border-ink sm:flex"
          >
            <Search className="size-3.5 shrink-0 text-muted-2" strokeWidth={1.6} />
            <input
              name="q"
              type="search"
              placeholder="Search flipbooks"
              aria-label="Search flipbooks"
              className="w-full min-w-0 bg-transparent text-[12.5px] outline-none placeholder:text-muted-3"
            />
          </Form>
          <ButtonLink href="/dashboard/flipbooks/new" className="text-[13px]">
            <Plus className="size-[13px]" strokeWidth={1.8} />
            Create flipbook
          </ButtonLink>
        </header>

        <div key={pathname} className="flex-1 animate-fbfade px-4 pt-7 pb-[60px] md:px-7">
          {children}
        </div>
      </main>
    </div>
  );
}
