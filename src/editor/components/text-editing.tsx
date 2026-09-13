"use client";

import { useLayoutEffect, useRef } from "react";
import { TEXT_CLASS, textStyle } from "@/components/flipbook/page-canvas";
import type { Page, TextElement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEditor } from "../state/editor-context";
import { htmlToRuns, runsToHtml } from "../text/runs";

/**
 * Inline text editing: the text element becomes a contentEditable with the exact same
 * typography, so nothing moves when editing starts. The whole session is one undo step,
 * committed when the editor loses focus or on Escape.
 */
export function TextEditing({ element, page }: { element: TextElement; page: Page }) {
  const ref = useRef<HTMLDivElement>(null);
  const setText = useEditor((s) => s.setText);
  const done = useRef(false);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    done.current = false;
    // Filled once; React never re-renders the children, the browser owns them while editing.
    // runsToHtml escapes the text, so the only markup is our own <em> and <br>.
    node.innerHTML = runsToHtml(element.properties.runs);
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    // A pointer press anywhere else ends the session before that press is handled, so a
    // click on another element commits this text first (removing a focused node fires no blur).
    const onPointerDown = (e: PointerEvent) => {
      if (!node.contains(e.target as Node)) node.blur();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
    // Only when a session starts: later renders must not reset what the user typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element.id]);

  const finish = () => {
    const node = ref.current;
    if (!node || done.current) return;
    done.current = true;
    setText(element.id, htmlToRuns(node));
  };

  return (
    <div
      ref={ref}
      role="textbox"
      aria-multiline
      aria-label={`Edit ${element.name}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      className={cn(TEXT_CLASS, "cursor-text outline-none")}
      style={textStyle(element, page)}
      onBlur={finish}
      onKeyDown={(e) => {
        const mod = e.metaKey || e.ctrlKey;
        const key = e.key.toLowerCase();
        if (e.key === "Escape") {
          e.preventDefault();
          ref.current?.blur();
        } else if (mod && key === "i") {
          e.preventDefault();
          document.execCommand("italic");
        } else if (mod && (key === "b" || key === "u")) {
          // Runs only carry italic; don't let the browser add markup we would drop.
          e.preventDefault();
        }
        e.stopPropagation();
      }}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
      }}
      onDrop={(e) => e.preventDefault()}
    />
  );
}
