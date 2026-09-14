import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tn23.vercel.app";
const TITLE = "TN23 — Kosapet Cycle Stories | Vellore Cycle Repair & Delivery Game";
const DESCRIPTION =
  "TN23 Kosapet Cycle Stories — a free browser game from Vellore, Tamil Nadu. Run a bicycle repair shop, fix punctures, chains and brakes, and deliver cycles across a miniature Kosapet. Play in English & Tamil (தமிழ்).";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · TN23 Kosapet",
  },
  description: DESCRIPTION,
  keywords: [
    "TN23", "Kosapet", "Vellore game", "Tamil Nadu game", "Tamil game",
    "cycle repair game", "bicycle delivery game", "browser game",
    "free online game India", "கோசப்பேட்டை", "வேலூர்", "சைக்கிள் கேம்",
  ],
  authors: [{ name: "TN23 — Kosapet Cycle Stories" }],
  creator: "TN23 — Kosapet Cycle Stories",
  category: "games",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    alternateLocale: ["ta_IN"],
    url: "/",
    siteName: "TN23 — Kosapet Cycle Stories",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "TN23 — Kosapet Cycle Stories, Vellore" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#294b45",
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "TN23 — Kosapet Cycle Stories",
  description: DESCRIPTION,
  url: SITE_URL,
  image: `${SITE_URL}/opengraph-image`,
  inLanguage: ["en", "ta"],
  gameLocation: "Kosapet, Vellore, Tamil Nadu, India",
  applicationCategory: "Game",
  operatingSystem: "Web browser",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
