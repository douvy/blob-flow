import './globals.css';
import type { Metadata, Viewport } from 'next';
import Analytics from '@/components/Analytics';
import AppProviders from '@/components/AppProviders';
import AppChrome from '@/components/AppChrome';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/constants';
import { defaultOgMetadata } from '@/lib/pageMetadata';

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
  // Default card for routes without one of their own: the dynamic home card.
  // Pages that describe something more specific (a network, a block, an
  // address, a chart) replace it in pageMetadata.
  ...defaultOgMetadata(),
  icons: {
    icon: '/images/favicon.png',
    apple: '/images/favicon.png',
  },
};

export const viewport: Viewport = {
  // Matches --color-background in globals.css so mobile browser chrome
  // blends with the app.
  themeColor: '#121316',
};

// Structured data so search engines recognize the site entity and surface
// BlobFlow as a live analytics app.
const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    isAccessibleForFree: true,
  },
];

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
        <Analytics />
        <AppProviders>
          <AppChrome>{children}</AppChrome>
        </AppProviders>
      </body>
    </html>
  );
}
