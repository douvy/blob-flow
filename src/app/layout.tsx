import './globals.css';
import type { Metadata } from 'next';
import AppProviders from '@/components/AppProviders';
import Header from '@/components/Header';
import IndexerStatusBanner from '@/components/IndexerStatusBanner';
import Footer from '@/components/Footer';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/constants';
import { ogImageMetadata } from '@/lib/og/metadata';

// Removed Inter font

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'real-time blob analytics',
    'Ethereum blobs',
    'EIP-4844',
    'blob base fee',
    'blob fee tracker',
    'proto-danksharding',
    'blobspace',
    'L2 rollups',
    'Arbitrum',
    'Optimism',
    'Base',
    'zkSync',
  ],
  // Default Open Graph card for routes without their own: the dynamic home
  // card at its default time range. Home and chart pages override this per
  // request with a range-carrying URL, and block/user pages override it via
  // their opengraph-image.tsx file conventions.
  ...ogImageMetadata({
    imageUrl: '/opengraph-image',
    alt: 'BlobFlow: live Ethereum blob base fee and top rollup blob shares',
  }),
  icons: {
    icon: '/images/favicon.png',
  },
};

// Structured data so search engines surface BlobFlow as a live analytics app.
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  isAccessibleForFree: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            // Escape `<` so the payload can never close the script tag.
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
        <AppProviders>
          <main className="flex min-h-screen flex-col bg-background xl:bg-grid-pattern xl:bg-grid-size">
            <div className="gutter-lines" aria-hidden="true" />
            <div className="gutter-line-cap" aria-hidden="true" />
            <Header />
            <IndexerStatusBanner />
            <div className="content-area flex-1">{children}</div>
            <Footer />
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
