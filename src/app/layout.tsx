import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import { siteUrl, isIndexable } from "@/lib/site";
import "./globals.css";

export const dynamic = "force-dynamic";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Babajan Sumangali — Wear Your Story", template: "%s | Babajan Sumangali" },
  description: "Considered fashion for women and men — modern tradition, personal expression, and considered elegance from Babajan Sumangali.",
  applicationName: "Babajan Sumangali",
  openGraph: {
    type: "website",
    siteName: "Babajan Sumangali",
    locale: "en_IN",
    images: [{ url: "/brand/og-default.png", width: 1200, height: 630, alt: "Babajan Sumangali" }],
  },
  twitter: { card: "summary_large_image" },
  robots: isIndexable() ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#F8F6F1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${cormorant.variable} ${montserrat.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-[100] rounded-sm bg-navy px-4 py-3 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
