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
npm run dev      # Dev server on localhost:3000
npm run build    # Production build
npm run lint     # ESLint
npm start        # Production server
```

No test framework is configured.

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

- **API layer:** Modular client in `src/lib/api/` — `core.ts` handles HTTP with exponential backoff retry (max 2, 5xx only) and 10s timeout via AbortController
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
- Tailwind utility classes for all styling — no CSS modules
- Custom fonts: GT Flexa, Windsor Bold

## Environment Variables

- `NEXT_PUBLIC_API_URL` — API base URL (default: `https://blob-indexer.ahkc.win/api/v1`)
- `NEXT_PUBLIC_USE_MOCK_DATA` — Toggle mock data (default: `false`)
