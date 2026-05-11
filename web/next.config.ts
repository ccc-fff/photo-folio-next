import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Domaines autorisés pour next/image (si utilisé à l'avenir)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/images/**',
      },
    ],
  },
  // Génération statique (SSG)
  output: 'export',
};

export default nextConfig;
