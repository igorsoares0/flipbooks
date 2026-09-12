import { test as base, expect } from "@playwright/test";

type Fixtures = {
  /** Console errors a test expects, e.g. the browser's own log for a 404 document. */
  allowedConsoleErrors: RegExp[];
  consoleErrors: string[];
};

export const test = base.extend<Fixtures>({
  // Typing into a server-rendered input before React hydrates loses the change, so
  // navigations wait for the page's scripts to finish loading unless a test says otherwise.
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page);
    page.goto = (url, options) => goto(url, { waitUntil: "networkidle", ...options });
    await use(page);
  },

  allowedConsoleErrors: [[], { option: true }],

  /** Fails any test whose page logs an unexpected console error or throws (hydration mismatches included). */
  consoleErrors: [
    async ({ page, allowedConsoleErrors }, use) => {
      const errors: string[] = [];
      const record = (text: string) => {
        if (!allowedConsoleErrors.some((pattern) => pattern.test(text))) errors.push(text);
      };
      page.on("console", (msg) => msg.type() === "error" && record(msg.text()));
      page.on("pageerror", (err) => record(err.message));
      await use(errors);
      expect(errors, "console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
