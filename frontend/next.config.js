/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pins the Turbopack/webpack root so Next doesn't guess it from the
  // monorepo's extra lockfile at the repo root.
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      { source: '/branches', destination: '/masters?tab=branches', permanent: false },
      { source: '/leave-policies', destination: '/system-settings?tab=leave', permanent: false },
      { source: '/leave/balances', destination: '/leave-setup', permanent: false },
    ];
  },
  async rewrites() {
    // Local dev only: proxy /api/* to the backend. On Vercel the top-level
    // vercel.json routes /api/* to the app service, so no rewrite is needed.
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBase) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
