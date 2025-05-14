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
