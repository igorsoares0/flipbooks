import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { isGoogleEnabled } from "@/lib/auth";
import { safeNext } from "@/lib/auth/redirects";
import { getOptionalUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, reset } = await searchParams;
  const destination = safeNext(next);
  if (await getOptionalUser()) redirect(destination);

  return (
    <AuthForm
      mode="login"
      googleEnabled={isGoogleEnabled}
      next={destination}
      notice={reset ? "Password updated. Log in with your new password." : undefined}
    />
  );
}
