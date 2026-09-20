import pkg from './package.json' with { type: 'json' };

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Next 16.3 runs the project-local tsc CLI for the build type check by
    // default. The CLI checks every file the tsconfig selects, including the
    // *.test.ts(x) files this repo deliberately leaves out of type checking
    // (see tsconfig.typecheck.json), which have never been type-clean. The
    // compiler-API checker skips test files, matching npm run typecheck.
    // Revisit when TypeScript 7 lands, since its JavaScript API is unavailable.
    useTypeScriptCli: false,
  },
  output: 'standalone', // Optimizes for Vercel deployment
  // The share card routes read fonts and images from public/ at request time
  // via fs (satori needs the raw .woff bytes and a data URI for the logo).
  // Static tracing cannot see through those runtime path joins, so include
  // them explicitly for serverless and standalone bundles; the /vs card also
  // draws entity icons.
  outputFileTracingIncludes: {
    '/**': ['./public/fonts/**/*.woff', './public/images/logo.png'],
    '/vs/[a]/[b]/opengraph-image': ['./public/fonts/**/*', './public/images/entities/**/*'],
    '/vs/[a]/[b]/[range]/opengraph-image': ['./public/fonts/**/*', './public/images/entities/**/*'],
  },
  env: {
    NEXT_PUBLIC_USE_MOCK_DATA: process.env.NEXT_PUBLIC_USE_MOCK_DATA || 'false',
    // APP_VERSION lets a build stamp itself with something other than the
    // released package version — dev images pass main-<sha> so the footer
    // identifies the commit rather than the last release.
    NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION || pkg.version,
  },
};

export default nextConfig;
