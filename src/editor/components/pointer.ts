import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * Follows one pointer from a pointerdown until it is released. Capturing the pointer
 * keeps the drag alive when it leaves the element (or the window).
 */
export function trackPointer(
  e: ReactPointerEvent<Element>,
  { move, end }: { move: (event: PointerEvent) => void; end: (event: PointerEvent | null) => void },
) {
  const target = e.currentTarget;
  const pointerId = e.pointerId;
  try {
    target.setPointerCapture(pointerId);
  } catch {
    // Synthetic events (tests) have no active pointer to capture.
  }
  let finished = false;

  const onMove = (event: Event) => {
    if ((event as PointerEvent).pointerId === pointerId) move(event as PointerEvent);
  };
  const finish = (event: Event) => {
    if (finished || (event as PointerEvent).pointerId !== pointerId) return;
    finished = true;
    target.removeEventListener("pointermove", onMove);
    target.removeEventListener("pointerup", finish);
    target.removeEventListener("pointercancel", finish);
    target.removeEventListener("lostpointercapture", finish);
    end(event.type === "pointerup" ? (event as PointerEvent) : null);
  };

  target.addEventListener("pointermove", onMove);
  target.addEventListener("pointerup", finish);
  target.addEventListener("pointercancel", finish);
  target.addEventListener("lostpointercapture", finish);
}
