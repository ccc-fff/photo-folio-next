import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frédéric Fornini — Photographe",
  description: "Portfolio de Frédéric Fornini, photographe basé à Paris",
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
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
