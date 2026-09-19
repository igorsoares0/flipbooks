import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { isGoogleEnabled } from "@/lib/auth";
import { safeNext } from "@/lib/auth/redirects";
import { getOptionalUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  // "Get Pro" on the pricing page signs up first, then lands on billing.
  const destination = safeNext((await searchParams).next);
  if (await getOptionalUser()) redirect(destination);
  return <AuthForm mode="register" googleEnabled={isGoogleEnabled} next={destination} />;
}
