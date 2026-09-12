import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from ".";

// Data Access Layer: the real authorization check, memoized per request.
// proxy.ts only does an optimistic cookie check.

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export async function getOptionalUser() {
  return (await getSession())?.user ?? null;
}

/** The signed-in user, or a redirect to /login that comes back to the current page. */
export async function requireUser() {
  const user = await getOptionalUser();
  if (!user) {
    const path = (await headers()).get("x-pathname") ?? "/dashboard";
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  return user;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getOptionalUser>>>;
