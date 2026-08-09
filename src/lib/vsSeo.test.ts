import { describe, expect, it } from 'vitest';
import { buildVsMetadata } from './vsSeo';

function canonicalOf(metadata: ReturnType<typeof buildVsMetadata>): string {
  return String(metadata.alternates?.canonical ?? '');
}

describe('buildVsMetadata', () => {
  it('keeps the default network on the bare battle paths', () => {
    expect(canonicalOf(buildVsMetadata('base', 'op-mainnet', '24h'))).toBe('/vs/base/op-mainnet');
    expect(canonicalOf(buildVsMetadata('base', 'op-mainnet', '7d', 'mainnet'))).toBe(
      '/vs/base/op-mainnet/7d'
    );
    expect(buildVsMetadata('base', 'op-mainnet', '24h', 'mainnet').title).toBe(
      'Base vs OP Mainnet: Blob Battle'
    );
  });

  // The canonical is what tells crawlers these are different pages rather
  // than duplicates of the mainnet matchup.
  it('scopes the canonical URL to the network in the route', () => {
    expect(canonicalOf(buildVsMetadata('base', 'op-mainnet', '24h', 'sepolia'))).toBe(
      '/sepolia/vs/base/op-mainnet'
    );
    expect(canonicalOf(buildVsMetadata('base', 'op-mainnet', '7d', 'sepolia'))).toBe(
      '/sepolia/vs/base/op-mainnet/7d'
    );
  });

  it('names a non-default network in the title', () => {
    expect(buildVsMetadata('base', 'op-mainnet', '24h', 'sepolia').title).toBe(
      'Base vs OP Mainnet: Blob Battle · Sepolia'
    );
  });

  it('canonicalizes the entity slugs, network segment and all', () => {
    expect(canonicalOf(buildVsMetadata('Arbitrum', 'optimism', '24h', 'sepolia'))).toBe(
      '/sepolia/vs/arbitrum-one/op-mainnet'
    );
  });
});
