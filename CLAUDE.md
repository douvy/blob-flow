# CLAUDE.md

## Project Overview

Blob Flow is an Ethereum EIP-4844 blob data analytics dashboard. It visualizes real-time blob transactions, costs, and L2 usage patterns (Arbitrum, Optimism, Base, zkSync).

## Tech Stack

- **Framework:** Next.js 15 (App Router) with React 19, TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS 3 with custom dark theme
- **Charts:** Recharts
- **Ethereum utils:** Viem (wei formatting)
- **Deployment:** Vercel (standalone output)

## Commands

```bash
npm run dev        # Dev server on localhost:3000
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit (tsconfig.typecheck.json)
npm test           # Run Vitest suite once
npm run test-watch # Vitest in watch mode
npm start          # Production server
npm run sync-icons # Refresh entity logos from the blob-list registry release
```

`npm run sync-icons` regenerates `public/images/entities/` and `src/constants/entityIcons.generated.ts` from the latest tirante-dev/blob-list release; both are committed, so builds never fetch anything. Do not edit those files by hand.

Tests use Vitest (`*.test.ts` / `*.test.tsx` colocated with source). Use `npm run typecheck` rather than plain `tsc --noEmit`: the dedicated config scopes the check correctly.

## Project Structure

```
src/
├── app/            # Next.js App Router pages and layout
├── components/     # React components ("use client" directive)
├── hooks/          # Custom React hooks (useApiData, useNetwork, etc.)
├── lib/api/        # Modular API client with retry/timeout logic
├── types/          # TypeScript interfaces
├── constants/      # App config, network settings
└── utils/          # Utility functions
```

## Architecture Patterns

- **API layer:** Modular client in `src/lib/api/`; `core.ts` handles HTTP with exponential backoff retry (max 2, 5xx only) and 10s timeout via AbortController
- **Type transformation:** Backend response types (e.g. `BlobResponse`) are transformed to frontend types (e.g. `Block`) in the API modules
- **All responses** wrapped in `ApiResponse<T>` with `success`, `data`, and optional `error`
- **Network-aware:** API calls accept optional network param via `useNetwork` hook; selection persisted in localStorage
- **Data fetching:** `useApiData` hook handles polling, pagination, loading/error states
- **Error display:** `DataStateWrapper` component provides consistent loading/error UI

## Code Conventions

- Use `@/*` path alias for imports (maps to `src/*`)
- Types go in `src/types/index.ts`
- Constants go in `src/constants/index.ts`
- Utilities go in `src/utils/index.ts`
- Components are functional, client-side (`"use client"`)
- Tailwind utility classes for all styling; no CSS modules
- Custom fonts: GT Flexa, Windsor Bold

## Writing Style

Never use em dashes (—) anywhere: UI copy, code comments, commit messages, PR titles and descriptions, or documentation. Use a period, comma, colon, semicolon, or parentheses instead.

## CI Standards

Never make CI less restrictive. Do not add lint/type-check exceptions (e.g. `eslint-disable`, `@ts-ignore`, `any` casts), skip checks, or loosen rules to make builds pass. Fix the underlying issue instead.

## Pull Request Titles

PR titles must use Conventional Commit format: `type: subject` or `type(scope): subject`. Allowed types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `deps`, and `revert`. The `deps` type is reserved for Dependabot updates and is what routes them into the Dependencies section of the release-please changelog. Keep the subject non-empty and do not prefix titles with labels such as `[codex]`.

## Environment Variables

- `NEXT_PUBLIC_API_URL`: API base URL (default: `https://api.blobflow.com/api/v1`)
- `NEXT_PUBLIC_USE_MOCK_DATA`: Toggle mock data (default: `false`)
- `NEXT_PUBLIC_SITE_URL`: Canonical site origin for SEO metadata, Open Graph image URLs, sitemap, and robots (falls back to `VERCEL_URL`, then `http://localhost:3000`). Must be set for **both** the build and the runtime: Next inlines it into the client bundle at build time but leaves it as a runtime `process.env` lookup in the server bundle, so a value supplied only at run time still ships a stale client bundle, and one supplied only at build time still renders `localhost` meta tags. The Dockerfile wires it through both stages via the `NEXT_PUBLIC_SITE_URL` build arg (default `https://blobflow.com`). Leaving it unset makes every `og:image`, canonical link, and sitemap entry point at `http://localhost:3000`, so link previews fail everywhere.
- `BLOB_ARCHIVE_URL`: Server-only base URL of a BlobArchive (bloar) follower's read API including the head prefix (e.g. `http://127.0.0.1:8550/live`). Enables the raw blob viewer; unset disables it (the proxy route returns 501)
- `BLOB_ARCHIVE_NETWORK`: Network the follower archives, matched against the viewer's network param (default: `mainnet`)
- `BLOB_ARCHIVE_TOKEN`: Optional bearer token sent by the proxy, for deployments that front the follower with an authenticating proxy
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID`: Umami website id. Unset (the default) renders no tracker script, so development, tests, and unconfigured deployments collect nothing. Must be present at **build** time: Next inlines `NEXT_PUBLIC_` values into the client bundle, so a value supplied only at run time ships a bundle that never loads the tracker. The Dockerfile takes it as a build arg and the publish workflow passes the `UMAMI_WEBSITE_ID` repository variable
- `UMAMI_URL`: Server-only base URL of the Umami instance (e.g. `http://umami:3000`). Read per request by the `/api/stats` proxy, so run-time only is fine here. Both this and the website id must be set for analytics to work; unset makes `/api/stats/script.js` 404 and leaves `window.umami` absent, which turns every `trackEvent` call into a no-op

## Analytics

Self-hosted [Umami](https://umami.is), proxied through this app's own origin so no third-party analytics hostname appears in the page:

- `src/app/api/stats/[...path]/route.ts` relays exactly two upstream paths, `script.js` (GET) and `api/send` (POST). Anything else 404s: the upstream base is operator-set, but an open path would make the route a proxy into the deployment's network. Cookies are never forwarded; `user-agent`, `accept-language`, and the forwarded-for chain are, since Umami derives device, language, and location from them
- `src/components/Analytics.tsx` renders the tracker, gated on the website id. Pageviews are automatic (the tracker hooks `history.pushState`, so App Router navigations are counted with no per-page wiring)
- `src/lib/analytics.ts` holds `trackEvent`, typed by an event-name to properties map. Add new events there rather than calling `window.umami` directly. Every call is a no-op when the tracker is absent, and a tracker error is swallowed: a UI handler must never break because a beacon failed
- The same module's `beforeSend` (wired up as the tracker's `data-before-send`) drops the pageview a time range toggle would otherwise produce. The range lives in the query string, and the tracker reports on any URL change, so without it the most common interaction in the app would inflate pageviews on the busiest pages. The switch is still recorded as a `time-range-change` event. Nothing else is suppressed: campaign parameters, which Umami reads off the URL, pass through
- Umami stores no cookies and no personal data, so no consent banner is required. `data-do-not-track` is on, so DNT visitors are not counted

If the deployment does not sit behind a reverse proxy that sets `X-Forwarded-For`, set `CLIENT_IP_HEADER` on the Umami side or every visitor resolves to the app container's address.
