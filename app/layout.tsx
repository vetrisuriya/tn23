import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tn23.vercel.app";
const TITLE = "TN23 — Kosapet Cycle Stories | Vellore Cycle Repair & Delivery Game";
const DESCRIPTION =
  "TN23 Kosapet Cycle Stories — a free browser game from Vellore, Tamil Nadu. Run a bicycle repair shop, fix punctures, chains and brakes, and deliver cycles across a miniature Kosapet. Play in English & Tamil (தமிழ்).";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "TN23",
  title: {
    default: TITLE,
    template: "%s · TN23 Kosapet",
  },
  description: DESCRIPTION,
  keywords: [
    "TN23", "Kosapet", "Vellore game", "Tamil Nadu game", "Tamil game",
    "cycle repair game", "bicycle delivery game", "browser game",
    "free online game India", "3D game India", "Vellore tourism",
    "Kuttai Medu Market", "Sundareswarar Kovil", "no download game",
    "கோசப்பேட்டை", "வேலூர்", "சைக்கிள் கேம்", "தமிழ் கேம்",
  ],
  authors: [{ name: "TN23 — Kosapet Cycle Stories", url: SITE_URL }],
  creator: "TN23 — Kosapet Cycle Stories",
  publisher: "TN23 — Kosapet Cycle Stories",
  category: "games",
  referrer: "origin-when-cross-origin",
  formatDetection: { telephone: false, email: false, address: false },
  alternates: {
    canonical: "/",
    languages: { "en-IN": "/", "ta-IN": "/", "x-default": "/" },
  },
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
    images: [{ url: "/opengraph-image", alt: "TN23 — Kosapet Cycle Stories, Vellore" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TN23",
  },
  other: { "mobile-web-app-capable": "yes" },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#294b45",
};

const ORG = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#org`,
  name: "TN23 — Kosapet Cycle Stories",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    ORG,
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#site`,
      url: SITE_URL,
      name: "TN23 — Kosapet Cycle Stories",
      description: DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#org` },
      inLanguage: ["en-IN", "ta-IN"],
    },
    {
      "@type": "VideoGame",
      name: "TN23 — Kosapet Cycle Stories",
      alternateName: "கோசப்பேட்டை சைக்கிள் கதைகள்",
      description: DESCRIPTION,
      url: SITE_URL,
      image: `${SITE_URL}/opengraph-image`,
      screenshot: `${SITE_URL}/opengraph-image`,
      inLanguage: ["en", "ta"],
      gameLocation: "Kosapet, Vellore, Tamil Nadu, India",
      applicationCategory: "Game",
      applicationSubCategory: "Simulation game",
      gamePlatform: ["Web browser", "Mobile web"],
      operatingSystem: "Any",
      genre: ["Simulation", "Delivery", "Casual"],
      playMode: "SinglePlayer",
      author: { "@id": `${SITE_URL}/#org` },
      publisher: { "@id": `${SITE_URL}/#org` },
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR", availability: "https://schema.org/InStock" },
      contentRating: "Everyone",
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <noscript>
          <div style={{ padding: 24, fontFamily: "Arial, sans-serif", color: "#29453f", background: "#fff8dd" }}>
            <h1>TN23 — Kosapet Cycle Stories</h1>
            <p>
              A free 3D browser game from Vellore, Tamil Nadu. Run a bicycle repair shop in Kosapet,
              fix punctures, chains and brakes, and deliver cycles across a miniature town with real
              landmarks — Masilamani Street, Kuttai Medu Market, Sundareswarar Kovil, Subramani Swamy
              Kovil and Kosapet Bus Stop. Playable in English and Tamil (தமிழ்).
            </p>
            <p>This game needs JavaScript. Please enable JavaScript to play.</p>
          </div>
        </noscript>
      </body>
    </html>
  );
}
