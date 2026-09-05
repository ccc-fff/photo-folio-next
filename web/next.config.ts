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
  // Dev uniquement : proxy des URLs /photos/* vers le CDN Sanity (mêmes règles
  // que web/vercel.json en prod ; ignoré par l'export statique).
  async rewrites() {
    return [
      {
        source: '/photos/:file/:name',
        destination: 'https://cdn.sanity.io/images/nbpf7c4u/production/:file',
      },
    ];
  },
};

export default nextConfig;
