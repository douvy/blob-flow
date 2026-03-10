import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';

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
      <head>
        <Script
          src="https://kit.fontawesome.com/7f8f63cf7a.js"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
