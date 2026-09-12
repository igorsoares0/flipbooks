import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/dashboard/placeholder-page";

export const metadata: Metadata = { title: "Settings" };

export default function AccountSettingsPage() {
  return (
    <PlaceholderPage
      icon={Settings}
      title="Account settings"
      body="Profile, password, email and account deletion will live here once sign-in is connected."
    />
  );
}
