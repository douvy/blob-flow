import pkg from './package.json' with { type: 'json' };

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Optimizes for Vercel deployment
  // The dynamic Open Graph images read the site fonts from public/fonts at
  // request time (satori needs the raw .woff bytes). File tracing cannot see
  // through the runtime path join, so include them explicitly for serverless
  // and standalone bundles; without them the cards fall back to the default
  // font rather than failing.
  outputFileTracingIncludes: {
    '/**': ['./public/fonts/**/*.woff'],
  },
  env: {
    NEXT_PUBLIC_USE_MOCK_DATA: process.env.NEXT_PUBLIC_USE_MOCK_DATA || 'false',
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
};

export default nextConfig;
