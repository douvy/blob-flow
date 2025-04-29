# Blob Flow

An Ethereum EIP-4844 blob data analytics dashboard for visualizing and analyzing blob transactions, costs, and L2 usage patterns.

## Features

- Real-time blob metrics tracking (base fees, pending blobs, cost comparisons)
- Interactive data visualization with time-based filtering (24h, 7d, 30d, All)
- L2 attribution tracking (Arbitrum, Optimism, Base, zkSync)
- Latest blocks table with detailed blob information
- Top blob users analysis and detailed user metrics
- Network selection (Mainnet, Sepolia, Goerli)
- Responsive design with mobile navigation
- Keyboard shortcuts for search (/)

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
│   └── images/       # Image files and L2 logos
├── src/              # Source code
│   ├── app/          # Next.js App Router
│   ├── components/   # React components
│   │   ├── BlobGraphs.tsx         # Blob data visualizations
│   │   ├── ExplainerSection.tsx   # Educational content
│   │   ├── LatestBlocksTable.tsx  # Recent blocks with blob data
│   │   ├── LiveMetrics.tsx        # Real-time network metrics
│   │   ├── MempoolTable.tsx       # Pending blob transactions
│   │   ├── MetricsCharts.tsx      # Time-series data charts
│   │   ├── TopUsersTable.tsx      # Top blob data users
│   │   └── UserDetailView.tsx     # User-specific analytics
│   ├── constants/    # Application constants
│   ├── hooks/        # Custom React hooks
│   │   ├── useLocalStorage.ts     # Client-side storage
│   │   └── useSearchShortcut.ts   # Keyboard shortcut handling
│   ├── lib/          # Library code, API clients
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

- [Next.js](https://nextjs.org/) - React framework with App Router
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Recharts](https://recharts.org/) - Composable charting library
- [Font Awesome](https://fontawesome.com/) - Icon library

## License

This project is licensed under the MIT License - see the LICENSE file for details.