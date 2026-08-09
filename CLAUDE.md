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
