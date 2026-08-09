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

function matchesChromelessRoute(path: string): boolean {
  return CHROMELESS_ROUTES.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );
}

export function isChromelessRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  if (matchesChromelessRoute(pathname)) return true;

  // Network-scoped copies live under /<network>/live. The leading segment is
  // dropped without consulting the network list: the [network] layout 404s
  // any segment the deployment does not serve, so a path that renders at all
  // and ends in a chromeless route is that route. Matching on the list would
  // instead frame a dynamic-only network's kiosk in chrome whenever the
  // fallback list was in use.
  const withoutNetwork = pathname.replace(/^\/[^/]+/, '');
  return withoutNetwork !== pathname && matchesChromelessRoute(withoutNetwork);
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
