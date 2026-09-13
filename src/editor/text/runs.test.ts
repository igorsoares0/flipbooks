// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { htmlToRuns, runsText, runsToHtml } from "./runs";

const parse = (html: string) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return htmlToRuns(div);
};

describe("runs ↔ HTML", () => {
  it("round-trips italic runs and line breaks", () => {
    const runs = [{ text: "Summer\n" }, { text: "Catalog", italic: true }, { text: " 26" }];
    expect(runsToHtml(runs)).toBe("Summer<br><em>Catalog</em> 26");
    expect(parse(runsToHtml(runs))).toEqual(runs);
  });

  it("escapes text so it can never become markup", () => {
    expect(runsToHtml([{ text: '<img src=x onerror="alert(1)">' }])).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("reads the <i> and <div> lines browsers produce while typing", () => {
    expect(parse("Hello <i>big</i><div>world</div>")).toEqual([{ text: "Hello " }, { text: "big", italic: true }, { text: "\nworld" }]);
  });

  it("flattens any other markup (e.g. from a paste) to plain text", () => {
    expect(parse('<b>Bold</b> <a href="https://evil.test">link</a><script>x()</script>')).toEqual([{ text: "Bold linkx()" }]);
  });

  it("drops the trailing line break a contentEditable keeps open", () => {
    expect(parse("Line<br>")).toEqual([{ text: "Line" }]);
    expect(parse("<br>")).toEqual([]);
  });

  it("turns non-breaking spaces into normal spaces", () => {
    expect(runsText(parse("a&nbsp;b"))).toBe("a b");
  });
});
