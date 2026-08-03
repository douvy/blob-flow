import pkg from './package.json' with { type: 'json' };

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Optimizes for Vercel deployment
  // The /vs OG image reads fonts and entity icons from public/ at runtime via
  // fs, which static tracing cannot see; include them in the server bundle.
  outputFileTracingIncludes: {
    '/vs/[a]/[b]/opengraph-image': ['./public/fonts/**/*', './public/images/entities/**/*'],
    '/vs/[a]/[b]/[range]/opengraph-image': ['./public/fonts/**/*', './public/images/entities/**/*'],
  },
  env: {
    NEXT_PUBLIC_USE_MOCK_DATA: process.env.NEXT_PUBLIC_USE_MOCK_DATA || 'false',
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
};

export default nextConfig;
