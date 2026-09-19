import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

// Header and footer shared by the home page and the legal pages.

export const gutter = "px-[clamp(18px,4vw,56px)]";

export function SiteHeader() {
  return (
    <header
      className={`sticky top-0 z-10 flex h-[66px] items-center gap-4 border-b border-line bg-[rgba(243,241,236,.9)] backdrop-blur-[8px] ${gutter}`}
    >
      <Link href="/" className="text-ink hover:text-ink">
        <Logo />
      </Link>
      <nav className="ml-[26px] flex gap-5 text-[13px] text-ink-70 max-md:hidden">
        <Link href="/#features" className="hover:text-ink">
          Features
        </Link>
        <Link href="/#pricing" className="hover:text-ink">
          Pricing
        </Link>
        <Link href="/dashboard/templates" className="hover:text-ink">
          Templates
        </Link>
      </nav>
      <div className="ml-auto flex items-center gap-2.5">
        <Link href="/login" className="text-[13px] font-semibold whitespace-nowrap text-ink max-sm:hidden">
          Log in
        </Link>
        <ButtonLink href="/register">Start free</ButtonLink>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const links = [
    { href: "/#features", label: "Features" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/dashboard/templates", label: "Templates" },
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
    { href: "/refunds", label: "Refunds" },
  ];
  return (
    <footer className={`mx-auto flex max-w-[1180px] flex-wrap items-center gap-3.5 border-t border-line py-[26px] ${gutter}`}>
      <span className="text-xs text-muted-2">© 2026 Flipbook</span>
      <nav className="ml-auto flex flex-wrap gap-[18px] text-xs text-muted" aria-label="Footer">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-ink">
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
