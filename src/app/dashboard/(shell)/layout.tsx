import { AppShell } from "@/components/dashboard/app-shell";
import { getBilling, getCurrentUser, getFlipbooks } from "@/lib/data";
import { formatGb } from "@/lib/format";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function ShellLayout({ children }: LayoutProps<"/dashboard">) {
  const [user, billing, flipbooks] = await Promise.all([getCurrentUser(), getBilling(), getFlipbooks()]);
  const { usage, entitlements } = billing;

  return (
    <AppShell
      user={{ name: user.name, email: user.email, initials: initials(user.name) }}
      storage={{
        used: formatGb(usage.storageBytes),
        limit: formatGb(entitlements.maxStorageBytes),
        ratio: usage.storageBytes / entitlements.maxStorageBytes,
        planLabel: billing.plan === "LIFETIME" ? "Lifetime plan" : "Free plan",
      }}
      flipbookCount={flipbooks.length}
    >
      {children}
    </AppShell>
  );
}
