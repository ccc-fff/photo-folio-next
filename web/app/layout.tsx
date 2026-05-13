import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Frédéric Fornini — Photographe",
  description: "Photographier est une invitation à questionner notre regard et partager son émerveillement face à un monde qui ne va pas de soi.",
  authors: [{ name: "Frédéric Fornini" }],
  metadataBase: new URL("https://fredericfornini.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    title: "Frédéric Fornini — Photographe",
    description: "Photographier est une invitation à questionner notre regard et partager son émerveillement face à un monde qui ne va pas de soi.",
    url: "https://fredericfornini.com",
    siteName: "Frédéric Fornini",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Frédéric Fornini — Photographe",
    description: "Photographier est une invitation à questionner notre regard et partager son émerveillement face à un monde qui ne va pas de soi.",
    creator: "@fredericfornini",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <head>
        {/* Preconnect au CDN Sanity pour accélérer le chargement des images */}
        <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.sanity.io" />
        {/* Theme color pour Safari (mis à jour dynamiquement par Grid.tsx) */}
        <meta name="theme-color" content="#070707" />
      </head>
      <body>
        <I18nProvider>
          {children}
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  );
}
