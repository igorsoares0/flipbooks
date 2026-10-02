import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono, Newsreader, Schibsted_Grotesk } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

// Typefaces flipbook pages are designed in (PageCanvas). They are content, not UI, so a
// redesign of the app must not change them: existing pages would reflow.
const pageSans = Instrument_Sans({
  variable: "--font-page-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const pageSerif = Instrument_Serif({
  variable: "--font-page-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const pageMono = JetBrains_Mono({
  variable: "--font-page-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Flipbook — Create stunning flipbooks",
    template: "%s · Flipbook",
  },
  description:
    "Upload a PDF or design from scratch. Publish a link, embed it anywhere, and measure every page.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${schibsted.variable} ${newsreader.variable} ${pageSans.variable} ${pageSerif.variable} ${pageMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
