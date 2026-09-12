"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Submit button for the "create a blank canvas flipbook" form. */
export function OpenEditorButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="rounded-lg px-4" disabled={pending}>
      {pending ? "Creating…" : "Open editor"}
    </Button>
  );
}
