import './globals.css';
import type { Metadata } from 'next';
import AppProviders from '@/components/AppProviders';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SITE_URL } from '@/constants';

// Removed Inter font

const SITE_NAME = 'BlobFlow';
const SITE_TITLE = 'BlobFlow — Real-Time Ethereum Blob Analytics';
const SITE_DESCRIPTION =
  'Track the Ethereum EIP-4844 blob market in real time: live blob base fees, ' +
  'next-block fee predictions, mempool pressure, and L2 rollup usage across ' +
  'Arbitrum, Optimism, Base, and zkSync — streamed block by block.';

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
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: '/images/logo.png', alt: 'BlobFlow logo' }],
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/images/logo.png'],
  },
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
            <div className="content-area flex-1">{children}</div>
            <Footer />
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
