/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react'],
  },
  async headers() {
    return [
      {
        // HTML pages: nunca cachear — garante que o browser sempre busca o HTML
        // atualizado com os hashes corretos dos chunks JS
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
