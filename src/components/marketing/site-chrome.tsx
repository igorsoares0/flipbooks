import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

// Header and footer shared by the home page and the legal pages.

export const gutter = "px-[clamp(18px,5vw,72px)]";

export function SiteHeader() {
  return (
    <header className={`sticky top-0 z-10 flex h-[76px] items-center gap-10 border-b border-ink bg-paper ${gutter} max-md:h-16 max-md:gap-4`}>
      <Link href="/" className="text-ink hover:text-ink" aria-label="Flipbook home">
        <Logo className="text-[32px] max-md:text-[26px]" />
      </Link>
      <nav className="flex gap-7 text-[14.5px] max-md:hidden">
        <Link href="/#features" className="hover:text-accent">
          Features
        </Link>
        <Link href="/#pricing" className="hover:text-accent">
          Pricing
        </Link>
        <Link href="/dashboard/templates" className="hover:text-accent">
          Templates
        </Link>
      </nav>
      <div className="ml-auto flex items-center gap-5">
        <Link href="/login" className="text-[14.5px] font-semibold whitespace-nowrap text-ink hover:text-accent max-sm:hidden">
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
    <div className={gutter}>
      <footer className="flex flex-wrap items-center gap-6 border-t border-ink py-7 text-[13.5px] text-muted">
        <Logo className="text-[22px] text-ink" />
        <span>© 2026</span>
        <nav className="ml-auto flex flex-wrap gap-x-[22px] gap-y-2" aria-label="Footer">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  );
}
