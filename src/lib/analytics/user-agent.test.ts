import { describe, expect, it } from "vitest";
import { deviceOf, isBot } from "./user-agent";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID_PHONE = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const ANDROID_TABLET = "Mozilla/5.0 (Linux; Android 15; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

describe("user agents", () => {
  it("tells phones, tablets and desktops apart", () => {
    expect(deviceOf(IPHONE)).toBe("Mobile");
    expect(deviceOf(ANDROID_PHONE)).toBe("Mobile");
    expect(deviceOf(IPAD)).toBe("Tablet");
    expect(deviceOf(ANDROID_TABLET)).toBe("Tablet");
    expect(deviceOf(DESKTOP)).toBe("Desktop");
  });

  it("doesn't count crawlers, previews and scripts", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0 Safari/537.36")).toBe(true);
    expect(isBot("curl/8.5.0")).toBe(true);
    expect(isBot("")).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot(DESKTOP)).toBe(false);
    expect(isBot(IPHONE)).toBe(false);
  });
});
