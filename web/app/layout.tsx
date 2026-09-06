import type { Metadata } from "next";
import localFont from "next/font/local";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

const inter = localFont({
  src: "./fonts/InterVariable-latin.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "300 500",
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
        {/* Theme color pour Safari (mis à jour dynamiquement par Grid.tsx) */}
        <meta name="theme-color" content="#070707" />
      </head>
      <body>
        <I18nProvider>
          {children}
        </I18nProvider>
        {/* Umami self-hosted (base Neon) — script et endpoint proxifiés par le
            domaine (rewrites /stats/* dans vercel.json) pour passer les bloqueurs.
            data-domains évite de compter dev local et previews. */}
        {process.env.NODE_ENV === "production" && (
          <script
            defer
            src="/stats/script.js"
            data-website-id="4acd53f7-31fb-4ff5-b14d-8ecd467c405d"
            data-host-url="https://fredericfornini.com/stats"
            data-domains="fredericfornini.com"
          />
        )}
      </body>
    </html>
  );
}
