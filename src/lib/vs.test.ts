import { describe, expect, it } from 'vitest';
import type { BackendAttributionUsageShare } from '@/types';
import {
  averageCostPerBlobWei,
  buildVsComparison,
  buildVsHref,
  costPerMbWei,
  entityKeyForSlug,
  findShareBySlug,
  humanizeEntitySlug,
  isComparableShare,
  normalizeEntitySlug,
  parseVsRange,
  slugForEntityKey,
  VS_ROW_COUNT,
} from './vs';

function makeShare(overrides: Partial<BackendAttributionUsageShare>): BackendAttributionUsageShare {
  return {
    key: 'base',
    name: 'Base',
    category: 'rollup',
    blob_count: 0,
    total_cost_wei: '0',
    blob_share_percent: 0,
    spend_share_percent: 0,
    ...overrides,
  };
}

describe('parseVsRange', () => {
  it('accepts every supported range', () => {
    for (const range of ['1h', '24h', '7d', '30d', 'all'] as const) {
      expect(parseVsRange(range)).toBe(range);
    }
  });

  it('falls back to 24h for missing or bogus values', () => {
    expect(parseVsRange(null)).toBe('24h');
    expect(parseVsRange(undefined)).toBe('24h');
    expect(parseVsRange('90d')).toBe('24h');
    expect(parseVsRange('')).toBe('24h');
  });
});

describe('slug handling', () => {
  it('normalizes casing, encoding, and separators', () => {
    expect(normalizeEntitySlug('Op-Mainnet')).toBe('op-mainnet');
    expect(normalizeEntitySlug('op_mainnet')).toBe('op-mainnet');
    expect(normalizeEntitySlug('op%20mainnet')).toBe('op-mainnet');
  });

  it('resolves short aliases to blob-list slugs', () => {
    expect(normalizeEntitySlug('arbitrum')).toBe('arbitrum-one');
    expect(normalizeEntitySlug('optimism')).toBe('op-mainnet');
    expect(normalizeEntitySlug('zksync')).toBe('zksync-era');
  });

  it('survives malformed percent escapes', () => {
    expect(normalizeEntitySlug('base%')).toBe('base%');
  });

  it('round-trips backend keys through slugs', () => {
    expect(entityKeyForSlug('op-mainnet')).toBe('op_mainnet');
    expect(entityKeyForSlug('arbitrum')).toBe('arbitrum_one');
    expect(slugForEntityKey('op_mainnet')).toBe('op-mainnet');
    expect(entityKeyForSlug(slugForEntityKey('robinhood_chain'))).toBe('robinhood_chain');
  });

  it('finds shares by slug including aliases', () => {
    const shares = [makeShare({ key: 'arbitrum_one', name: 'Arbitrum One' })];
    expect(findShareBySlug(shares, 'arbitrum')?.key).toBe('arbitrum_one');
    expect(findShareBySlug(shares, 'base')).toBeUndefined();
  });

  it('never matches the aggregate other and unknown buckets', () => {
    const shares = [
      makeShare({ key: 'other', name: 'Other', category: 'other' }),
      makeShare({ key: 'unknown', name: 'Unknown', category: 'unknown' }),
      makeShare({ key: 'base', name: 'Base' }),
    ];
    expect(findShareBySlug(shares, 'other')).toBeUndefined();
    expect(findShareBySlug(shares, 'unknown')).toBeUndefined();
    expect(findShareBySlug(shares, 'base')?.key).toBe('base');
  });

  it('classifies aggregate buckets as non-comparable', () => {
    expect(isComparableShare(makeShare({ key: 'other', category: 'other' }))).toBe(false);
    expect(isComparableShare(makeShare({ key: 'unknown', category: 'unknown' }))).toBe(false);
    expect(isComparableShare(makeShare({ key: 'base', category: 'rollup' }))).toBe(true);
  });

  it('humanizes slugs with brand casing', () => {
    expect(humanizeEntitySlug('op-mainnet')).toBe('OP Mainnet');
    expect(humanizeEntitySlug('arbitrum')).toBe('Arbitrum One');
    expect(humanizeEntitySlug('x-layer')).toBe('X Layer');
    expect(humanizeEntitySlug('')).toBe('Unknown');
  });
});

describe('buildVsHref', () => {
  it('uses the bare path for the default range and a path segment otherwise', () => {
    expect(buildVsHref('base', 'arbitrum-one', '24h')).toBe('/vs/base/arbitrum-one');
    expect(buildVsHref('base', 'arbitrum-one', '7d')).toBe('/vs/base/arbitrum-one/7d');
    expect(buildVsHref('base', 'arbitrum-one', 'all')).toBe('/vs/base/arbitrum-one/all');
  });
});

describe('cost derivations', () => {
  it('computes floored average cost per blob', () => {
    const share = makeShare({ blob_count: 3, total_cost_wei: '10' });
    expect(averageCostPerBlobWei(share)).toBe('3');
  });

  it('computes cost per MB as eight blobs worth of data', () => {
    // 4 blobs = 0.5 MB for 1000 wei, so 2000 wei per MB.
    const share = makeShare({ blob_count: 4, total_cost_wei: '1000' });
    expect(costPerMbWei(share)).toBe('2000');
  });

  it('handles zero blobs and malformed wei without throwing', () => {
    expect(averageCostPerBlobWei(makeShare({ blob_count: 0, total_cost_wei: '5' }))).toBe('0');
    expect(costPerMbWei(makeShare({ blob_count: 0 }))).toBe('0');
    expect(averageCostPerBlobWei(makeShare({ blob_count: 2, total_cost_wei: 'nope' }))).toBe('0');
  });

  it('keeps precision beyond Number.MAX_SAFE_INTEGER', () => {
    const share = makeShare({ blob_count: 1, total_cost_wei: '123456789123456789123456789' });
    expect(averageCostPerBlobWei(share)).toBe('123456789123456789123456789');
  });
});

describe('buildVsComparison', () => {
  const base = makeShare({
    key: 'base',
    name: 'Base',
    blob_count: 6396,
    total_cost_wei: '2712518432391168',
    blob_share_percent: 22.65,
    spend_share_percent: 22.38,
  });
  const arbitrum = makeShare({
    key: 'arbitrum_one',
    name: 'Arbitrum One',
    blob_count: 1000,
    total_cost_wei: '500000000000000',
    blob_share_percent: 3.5,
    spend_share_percent: 4.1,
  });

  it('scores three independent contests, not their derived twins', () => {
    const comparison = buildVsComparison(base, arbitrum);
    expect(comparison.rows.map((row) => row.key)).toEqual([
      'blobs',
      'eth-spent',
      'cost-per-mb',
    ]);
    expect(comparison.rows).toHaveLength(VS_ROW_COUNT);
    const byKey = Object.fromEntries(comparison.rows.map((row) => [row.key, row]));

    expect(byKey['blobs'].winner).toBe('a');
    expect(byKey['eth-spent'].winner).toBe('a');
    // Base: 424096065 wei/blob; Arbitrum: 500000000 wei/blob. Lower wins.
    expect(byKey['cost-per-mb'].winner).toBe('a');
    expect(comparison.overall).toBe('a');
    expect(comparison.rowWins).toEqual({ a: 3, b: 0 });
  });

  it('carries each derived figure as row context rather than its own row', () => {
    const comparison = buildVsComparison(base, arbitrum);
    const byKey = Object.fromEntries(comparison.rows.map((row) => [row.key, row]));

    expect(byKey['blobs'].detail).toEqual({
      format: 'percent',
      label: 'share',
      a: '22.65',
      b: '3.5',
    });
    expect(byKey['eth-spent'].detail).toMatchObject({ label: 'share', a: '22.38', b: '4.1' });
    // Cost per blob is exactly cost per MB divided by eight.
    expect(byKey['cost-per-mb'].detail).toMatchObject({ label: 'per blob', format: 'cost' });
    expect(BigInt(byKey['cost-per-mb'].a) / BigInt(8)).toBe(
      BigInt(byKey['cost-per-mb'].detail!.a)
    );
  });

  it('awards the efficiency row to the cheaper side', () => {
    const spender = makeShare({ key: 'a', blob_count: 100, total_cost_wei: '1000000' });
    const efficient = makeShare({ key: 'b', blob_count: 50, total_cost_wei: '100000' });
    const comparison = buildVsComparison(spender, efficient);
    const byKey = Object.fromEntries(comparison.rows.map((row) => [row.key, row]));

    expect(byKey['blobs'].winner).toBe('a');
    expect(byKey['eth-spent'].winner).toBe('a');
    expect(byKey['cost-per-mb'].winner).toBe('b');
    expect(comparison.rowWins).toEqual({ a: 2, b: 1 });
    expect(comparison.overall).toBe('a');
  });

  it('marks identical shares as a full tie', () => {
    const twin = makeShare({ blob_count: 10, total_cost_wei: '100', blob_share_percent: 1, spend_share_percent: 1 });
    const comparison = buildVsComparison(twin, { ...twin });
    expect(comparison.rows.every((row) => row.winner === 'tie')).toBe(true);
    expect(comparison.overall).toBe('tie');
    expect(comparison.rowWins).toEqual({ a: 0, b: 0 });
  });

  it('splits the card when volume and efficiency disagree', () => {
    // The big spender buys dominance; the small one buys it cheaper.
    const bulky = makeShare({ key: 'a', blob_count: 200, total_cost_wei: '2000' });
    const lean = makeShare({ key: 'b', blob_count: 100, total_cost_wei: '500' });
    const comparison = buildVsComparison(bulky, lean);
    const byKey = Object.fromEntries(comparison.rows.map((row) => [row.key, row]));

    expect(byKey['blobs'].winner).toBe('a');
    expect(byKey['eth-spent'].winner).toBe('a');
    expect(byKey['cost-per-mb'].winner).toBe('b');
    expect(comparison.overall).toBe('a');
  });

  it('does not let an idle side win the efficiency row on a zero cost', () => {
    const idle = makeShare({ key: 'a', blob_count: 0, total_cost_wei: '0' });
    const active = makeShare({ key: 'b', blob_count: 5, total_cost_wei: '100' });
    const comparison = buildVsComparison(idle, active);
    const byKey = Object.fromEntries(comparison.rows.map((row) => [row.key, row]));

    expect(byKey['cost-per-mb'].winner).toBe('b');
    expect(comparison.rowWins).toEqual({ a: 0, b: 3 });
    expect(comparison.overall).toBe('b');
  });

  it('leaves the efficiency row untaken when neither side posted', () => {
    const idle = makeShare({ key: 'a', blob_count: 0, total_cost_wei: '0' });
    const comparison = buildVsComparison(idle, { ...idle, key: 'b' });
    const byKey = Object.fromEntries(comparison.rows.map((row) => [row.key, row]));

    expect(byKey['cost-per-mb'].winner).toBe('tie');
    expect(comparison.overall).toBe('tie');
  });
});
