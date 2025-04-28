import './globals.css';
import type { Metadata } from 'next';

// Removed Inter font

export const metadata: Metadata = {
  title: 'BlobFlow - Ethereum EIP-4844 Dashboard',
  description: 'Dashboard for tracking Ethereum EIP-4844 blob data statistics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}