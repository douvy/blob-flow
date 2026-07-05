import './globals.css';
import type { Metadata } from 'next';
import AppProviders from '@/components/AppProviders';
import Header from '@/components/Header';
import IndexerStatusBanner from '@/components/IndexerStatusBanner';
import Footer from '@/components/Footer';

// Removed Inter font

export const metadata: Metadata = {
  title: 'BlobFlow - Ethereum EIP-4844 Dashboard',
  description: 'Dashboard for tracking Ethereum EIP-4844 blob data statistics',
  icons: {
    icon: '/images/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
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
