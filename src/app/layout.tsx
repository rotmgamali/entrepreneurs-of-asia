import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteNav from "@/components/SiteNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://entrepreneursofasia.com"),
  title: "Chiang Mai Founders | Weekly Networking Events for Entrepreneurs & Digital Nomads",
  description:
    "Join Chiang Mai's highest-conviction founder network. Free weekly events every Thursday in Nimman — expert talks, curated networking, and an AI-powered content pipeline. Apply to attend.",
  keywords: [
    "networking events Chiang Mai",
    "digital nomads Chiang Mai",
    "entrepreneurs Chiang Mai",
    "founders Chiang Mai",
    "startup community Chiang Mai",
    "founder meetup Chiang Mai",
    "digital nomad community Thailand",
    "business networking Nimman",
    "Chiang Mai entrepreneur community",
    "remote work community Chiang Mai",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Chiang Mai Founders | Weekly Networking Events for Entrepreneurs & Digital Nomads",
    description:
      "Join Chiang Mai's highest-conviction founder network. Free weekly events every Thursday in Nimman — expert talks, curated networking, and an AI-powered content pipeline.",
    url: "https://entrepreneursofasia.com",
    siteName: "Chiang Mai Founders",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Entrepreneurs of Asia – Chiang Mai Founder Network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chiang Mai Founders | Weekly Networking for Entrepreneurs & Digital Nomads",
    description:
      "Free weekly founder events every Thursday in Nimman, Chiang Mai. Expert talks + curated networking. Apply to attend.",
    images: ["/og-image.png"],
    site: "@ChiangMaiFounders",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark"
    >
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col antialiased selection:bg-primary/30`}>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
