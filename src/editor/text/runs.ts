import type { TextRun } from "@/lib/types";

// Converts between stored text runs and the HTML of the inline contentEditable editor.
// Only plain text, italic and line breaks survive; any other markup the browser (or a
// paste) produces is flattened to text, so no HTML is ever stored.

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function runsToHtml(runs: TextRun[]) {
  return runs
    .map((run) => {
      const html = escapeHtml(run.text).replace(/\n/g, "<br>");
      return run.italic ? `<em>${html}</em>` : html;
    })
    .join("");
}

const ITALIC_TAGS = new Set(["EM", "I"]);
const BLOCK_TAGS = new Set(["DIV", "P", "LI"]);

export function htmlToRuns(root: Node): TextRun[] {
  const runs: TextRun[] = [];
  const push = (text: string, italic: boolean) => {
    if (!text) return;
    const last = runs.at(-1);
    if (last && Boolean(last.italic) === italic) last.text += text;
    else runs.push(italic ? { text, italic: true } : { text });
  };

  const walk = (node: Node, italic: boolean) => {
    node.childNodes.forEach((child, index) => {
      if (child.nodeType === 3 /* text */) {
        push((child.textContent ?? "").replace(/ /g, " "), italic);
        return;
      }
      if (child.nodeType !== 1 /* element */) return;
      const el = child as Element;
      const tag = el.tagName;
      if (tag === "BR") return push("\n", italic);
      const isBlock = BLOCK_TAGS.has(tag);
      // Browsers wrap each new line of a contentEditable in a <div>.
      if (isBlock && index > 0) push("\n", italic);
      const styleItalic = (el as HTMLElement).style?.fontStyle === "italic";
      walk(el, italic || ITALIC_TAGS.has(tag) || styleItalic);
    });
  };
  walk(root, false);

  // A trailing <br> is how browsers keep an empty last line open; it isn't content.
  const last = runs.at(-1);
  if (last?.text.endsWith("\n")) {
    last.text = last.text.slice(0, -1);
    if (!last.text) runs.pop();
  }
  return runs;
}

export function runsText(runs: TextRun[]) {
  return runs.map((r) => r.text).join("");
}
