import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { isGoogleEnabled } from "@/lib/auth";
import { getOptionalUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage() {
  if (await getOptionalUser()) redirect("/dashboard");
  return <AuthForm mode="register" googleEnabled={isGoogleEnabled} />;
}
