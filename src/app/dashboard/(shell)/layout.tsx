import { AppShell } from "@/components/dashboard/app-shell";
import { getBilling, getCurrentUser, getFlipbookCount } from "@/lib/data";
import { formatGb } from "@/lib/format";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export default async function ShellLayout({ children }: LayoutProps<"/dashboard">) {
  const [user, billing, flipbookCount] = await Promise.all([getCurrentUser(), getBilling(), getFlipbookCount()]);
  const { usage, entitlements } = billing;
  const lifetime = billing.plan === "LIFETIME";

  return (
    <AppShell
      user={{ name: user.name, email: user.email, initials: initials(user.name), emailVerified: user.emailVerified }}
      storage={{
        used: formatGb(usage.storageBytes),
        limit: formatGb(entitlements.maxStorageBytes),
        ratio: usage.storageBytes / entitlements.maxStorageBytes,
        planLabel: lifetime ? "Lifetime plan" : "Free plan",
        planBadge: lifetime ? "LTD" : "FREE",
      }}
      flipbookCount={flipbookCount}
    >
      {children}
    </AppShell>
  );
}
