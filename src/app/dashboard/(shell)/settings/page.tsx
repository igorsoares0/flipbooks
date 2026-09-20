import type { Metadata } from "next";
import { AccountSettings } from "@/components/account/account-settings";
import { getCurrentUser, hasPasswordAccount } from "@/lib/data";

export const metadata: Metadata = { title: "Settings" };

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();
  return (
    <AccountSettings
      user={{ name: user.name, email: user.email, emailVerified: user.emailVerified }}
      hasPassword={await hasPasswordAccount(user.id)}
    />
  );
}
