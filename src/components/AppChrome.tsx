"use client";

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import IndexerStatusBanner from './IndexerStatusBanner';
import Footer from './Footer';

/**
 * Routes that render their own full-viewport shell instead of the site
 * chrome. Matched by prefix so nested kiosk routes inherit the treatment.
 */
const CHROMELESS_ROUTES = ['/live'];

export function isChromelessRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return CHROMELESS_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Site frame (header, indexer banner, gutter lines, footer) around page
 * content.
 *
 * TV mode at /live needs the whole viewport with no chrome, so the frame is
 * chosen from the pathname here rather than duplicated into a second root
 * layout. `usePathname` resolves during the server render, so kiosk routes
 * never paint the header first and drop it on hydration, and every other page
 * keeps the exact markup it had before.
 */
export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isChromelessRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <main className="flex min-h-screen flex-col bg-background xl:bg-grid-pattern xl:bg-grid-size">
      <div className="gutter-lines" aria-hidden="true" />
      <div className="gutter-line-cap" aria-hidden="true" />
      <Header />
      <IndexerStatusBanner />
      <div className="content-area flex-1">{children}</div>
      <Footer />
    </main>
  );
}
