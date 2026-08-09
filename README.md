# Blob Flow

An Ethereum EIP-4844 blob data analytics dashboard for visualizing and analyzing blob transactions, costs, and L2 usage patterns.

## Features

- Real-time blob metrics tracking (base fees, pending blobs, cost comparisons)
- Interactive data visualization with time-based filtering (24h, 7d, 30d, All)
- L2 attribution tracking (Arbitrum, Optimism, Base, zkSync)
- Latest blocks table with detailed blob information
- Top blob users analysis and detailed user metrics
- Network selection (Mainnet, Sepolia)
- Responsive design with mobile navigation
- Keyboard shortcuts for search (/)
- Interactive search modal with comprehensive filtering options

## Getting Started

1. Clone the repository
   ```
   git clone https://github.com/yourusername/blob-flow.git
   cd blob-flow
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Run the development server
   ```
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Analytics

Optional, off by default, and served by a self-hosted [Umami](https://umami.is) instance you run yourself. Nothing is collected and no tracker script is rendered unless both variables below are set.

Umami is cookieless and stores no personal data, so no consent banner is needed. Visitors sending Do Not Track are excluded.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | build **and** run time | The website id from your Umami dashboard. Next inlines `NEXT_PUBLIC_` values into the client bundle, so this must be present when the image is built; setting it only at run time ships a bundle that never loads the tracker. |
| `UMAMI_URL` | run time, server only | Base URL of the Umami instance, e.g. `http://umami:3000`. Never reaches the browser. |

To enable it:

```bash
docker build --build-arg NEXT_PUBLIC_UMAMI_WEBSITE_ID=<website-id> -t blob-flow-web .
```

Then run the container with `UMAMI_URL` pointing at your instance. For published images, set the `UMAMI_WEBSITE_ID` repository variable and the release workflow bakes it in.

The tracker script and the endpoint it reports to are both served from this app's origin (`/api/stats/script.js` and `/api/stats/api/send`), proxied by `src/app/api/stats/[...path]/route.ts`. That means:

- The Umami instance needs no CORS configuration and does not need to be reachable from the public internet. A private address or container hostname is fine.
- No analytics hostname appears in the page, so filter lists that key on third-party analytics domains do not block collection.
- Only those two upstream paths are relayed; everything else 404s.

Two caveats when self-hosting:

- If the deployment does not sit behind a reverse proxy that sets `X-Forwarded-For`, set `CLIENT_IP_HEADER` on the Umami side, or every visitor resolves to the app container's address.
- Pageviews are collected automatically. Custom events live in `src/lib/analytics.ts`; add new ones to the typed event map there rather than calling `window.umami` directly.

Changing the time range does not count as a pageview, even though it rewrites the URL. It is recorded as a `time-range-change` event carrying both the old and new range, so the busiest pages keep an honest pageview count.

## Testing

This project uses Vitest with a CI-enforced 90% line coverage minimum for core logic.

- `npm run test` - run tests
- `npm run test-coverage` - run tests with coverage report
- `make test-coverage` - run coverage and enforce the threshold locally

## CI/CD

GitHub Actions workflows are configured for:

- `CI` (`.github/workflows/ci.yml`): lint, typecheck, test coverage enforcement, and production build checks on PRs and pushes to `main`/`master`
- `PR Title` (`.github/workflows/pr-title.yml`): enforces conventional commit style PR titles
- `Secrets Scan` (`.github/workflows/secrets-scan.yml`): gitleaks checks on PR/push, weekly schedule, and manual dispatch

## Project Structure

```
blob-flow/
├── public/           # Static assets
│   ├── images/       # Image files and L2 logos
│   └── fonts/        # Custom web fonts
├── src/              # Source code
│   ├── app/          # Next.js App Router
│   ├── components/   # React components
│   │   ├── BlobGraphs.tsx         # Blob data visualizations
│   │   ├── ExplainerSection.tsx   # Educational content
│   │   ├── Footer.tsx             # Site footer
│   │   ├── Header.tsx             # Application header with network selection
│   │   ├── LatestBlocksTable.tsx  # Recent blocks with blob data
│   │   ├── LiveMetrics.tsx        # Real-time network metrics
│   │   ├── MempoolTable.tsx       # Pending blob transactions
│   │   ├── MetricCard.tsx         # Individual metric display card
│   │   ├── MetricsCharts.tsx      # Time-series data charts
│   │   ├── SearchModal.tsx        # Search interface with filters
│   │   ├── TopUsersTable.tsx      # Top blob data users
│   │   └── UserDetailView.tsx     # User-specific analytics
│   ├── constants/    # Application constants
│   ├── hooks/        # Custom React hooks
│   │   ├── useLocalStorage.ts     # Client-side storage
│   │   └── useSearchShortcut.ts   # Keyboard shortcut handling
│   ├── lib/          # Library code, API clients
│   ├── styles/       # Global styles and CSS modules
│   ├── types/        # TypeScript type definitions
│   └── utils/        # Utility functions
├── .gitignore        # Git ignore file
├── next.config.js    # Next.js configuration
├── package.json      # Project dependencies
├── postcss.config.js # PostCSS configuration
├── tailwind.config.js # Tailwind CSS configuration
└── tsconfig.json     # TypeScript configuration
```

## Built With

- [Next.js](https://nextjs.org/) (v15.3.1) - React framework with App Router
- [React](https://react.dev/) (v19.1.0) - JavaScript UI library
- [TypeScript](https://www.typescriptlang.org/) (v5.8.3) - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) (v3.3.0) - Utility-first CSS framework
- [Recharts](https://recharts.org/) (v2.15.3) - Composable charting library
- [Font Awesome](https://fontawesome.com/) - Icon library via CDN

## Design Notes

- Custom typography using GT Flexa and Windsor Bold font families
- Dark theme with grid background pattern
- Mobile-optimized interface with bottom slide-up navigation menu
- Responsive design

## Development Status

The application is currently set up with placeholder/mock data for demonstration and development purposes. The API client is configured but points to a placeholder URL. The UI is fully functional with mock data to demonstrate the application's capabilities.

## License

This project is licensed under the MIT License.
