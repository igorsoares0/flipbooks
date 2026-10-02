"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Submit button for the "create a blank canvas flipbook" form. */
export function OpenEditorButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" className="px-5" disabled={pending}>
      {pending ? "Creating…" : "Open editor"}
    </Button>
  );
}
