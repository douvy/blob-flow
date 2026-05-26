import './globals.css';
import type { Metadata } from 'next';
import AppProviders from '@/components/AppProviders';

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
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
