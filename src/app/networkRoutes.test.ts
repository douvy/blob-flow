import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The network lives in the URL, and the header's network selector switches
 * networks by re-prefixing the current path. So every page that is reachable
 * at a bare path must also exist under /[network], or switching network on it
 * navigates to a route that does not exist and lands on the 404 page.
 *
 * This walks the route tree rather than listing the pages by hand: a new page
 * added to one tree and not the other is exactly the bug worth catching.
 */

const APP_DIR = path.join(process.cwd(), 'src', 'app');
const NETWORK_SEGMENT = '[network]';

/** Route paths (relative to their tree's root) that have a page. */
function pageRoutes(dir: string, prefix = ''): string[] {
  const routes: string[] = [];
  if (existsSync(path.join(dir, 'page.tsx'))) {
    routes.push(prefix || '/');
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    routes.push(...pageRoutes(path.join(dir, entry.name), `${prefix}/${entry.name}`));
  }

  return routes;
}

// The API routes are not pages and are never network-scoped by path.
const bareRoutes = readdirSync(APP_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'api' && entry.name !== NETWORK_SEGMENT)
  .flatMap((entry) => pageRoutes(path.join(APP_DIR, entry.name), `/${entry.name}`))
  .concat(existsSync(path.join(APP_DIR, 'page.tsx')) ? ['/'] : [])
  .sort();

const networkRoutes = pageRoutes(path.join(APP_DIR, NETWORK_SEGMENT)).sort();

describe('network-scoped routes', () => {
  it('finds the routes it is meant to be checking', () => {
    // A walk that silently found nothing would pass every assertion below.
    expect(bareRoutes).toContain('/vs/[a]/[b]');
    expect(bareRoutes.length).toBeGreaterThan(5);
  });

  it('serves every page under /[network] too', () => {
    expect(networkRoutes).toEqual(bareRoutes);
  });
});
