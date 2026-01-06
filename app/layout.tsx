import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frédéric Fornini — Photographe",
  description: "Portfolio de Frédéric Fornini, photographe. Séries photographiques, projets artistiques et travaux personnels.",
  authors: [{ name: "Frédéric Fornini" }],
  metadataBase: new URL("https://fredericfornini.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    title: "Frédéric Fornini — Photographe",
    description: "Portfolio de Frédéric Fornini, photographe. Séries photographiques, projets artistiques et travaux personnels.",
    url: "https://fredericfornini.com",
    siteName: "Frédéric Fornini",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Frédéric Fornini — Photographe",
    description: "Portfolio de Frédéric Fornini, photographe.",
    creator: "@fredericfornini",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        {/* Preconnect au CDN Sanity pour accélérer le chargement des images */}
        <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.sanity.io" />
        {/* Theme color pour Safari (mis à jour dynamiquement par Grid.tsx) */}
        <meta name="theme-color" content="#403F3F" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
