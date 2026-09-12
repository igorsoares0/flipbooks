"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLL_MS = 3_000;

/**
 * While any flipbook on screen is uploading or processing, re-fetches the page's server
 * data every few seconds so rows move to Ready (or Failed) without a manual reload.
 */
export function ProcessingWatcher({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [active, router]);
  return null;
}
