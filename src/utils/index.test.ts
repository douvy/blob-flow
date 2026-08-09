import {
  assignSeriesColors,
  attributionColorKey,
  beaconSlotForBlob,
  blobCountToBytes,
  buildTweetIntentUrl,
  chartImageFileName,
  computeBlobBytesPerSecond,
  computeCostPerMibWei,
  computeSecondsPerBlob,
  costToWei,
  deriveBeaconSlot,
  durationSecondsBetween,
  explorerHostLabel,
  explorerTxUrl,
  formatBlobCadence,
  formatBlobCount,
  formatBlobFee,
  formatBlobSize,
  formatBlobTotalCost,
  formatBlobWeiCost,
  formatCostEthOrWei,
  formatDataRate,
  formatDataVolume,
  formatDate,
  formatDuration,
  formatFeeHeadroom,
  formatDataComparison,
  formatGwei,
  formatNumber,
  formatPercent,
  formatSignedWeiToEth,
  formatUtilizationPercent,
  formatWeiToGwei,
  formatWeiToEth,
  formatWeiToReadable,
  attributionNeedsLightBackdrop,
  getAttributionImageSrc,
  getAttributionInitial,
  getAttributionSuggestionUrl,
  getAttributionTestnetLabel,
  getAttributionTestnetLabels,
  getBlobCount,
  getNetworkIconSrc,
  networkPath,
  parseSearchQuery,
  safeExplorerUrl,
  selectTopUsageShare,
  stripNetworkPath,
  truncateAddress,
  truncateTxHash,
} from './index';
import { isTimeRange, NETWORKS, parseTimeRange, TIME_RANGES } from '@/constants';
import type { BackendAttributionUsageShare } from '@/types';
import { DATA_COMPARISONS } from '@/constants/dataComparisons';

describe('utils', () => {
  it('formats numbers with locale separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('truncates addresses with default length', () => {
    expect(truncateAddress('0x1234567890abcdef')).toBe('0x1234...cdef');
    expect(truncateAddress('')).toBe('');
  });

  it('passes through http(s) explorer urls and rejects other schemes', () => {
    expect(safeExplorerUrl('https://etherscan.io/tx/0xabc')).toBe('https://etherscan.io/tx/0xabc');
    expect(safeExplorerUrl('http://localhost:3000/tx/0xabc')).toBe('http://localhost:3000/tx/0xabc');
    expect(safeExplorerUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeExplorerUrl('data:text/html,hi')).toBeUndefined();
    expect(safeExplorerUrl('not a url')).toBeUndefined();
    expect(safeExplorerUrl('')).toBeUndefined();
    expect(safeExplorerUrl(undefined)).toBeUndefined();
  });

  it('scopes in-app paths to a network, leaving the default network bare', () => {
    expect(networkPath('/blocks', 'sepolia')).toBe('/sepolia/blocks');
    expect(networkPath('/', 'sepolia')).toBe('/sepolia');
    expect(networkPath('/blocks', 'mainnet')).toBe('/blocks');
    expect(networkPath('/blocks', undefined)).toBe('/blocks');
    // Query strings and fragments survive the prefix.
    expect(networkPath('/#data-trends', 'sepolia')).toBe('/sepolia#data-trends');
    expect(networkPath('/charts/base-fee?range=24h', 'sepolia')).toBe(
      '/sepolia/charts/base-fee?range=24h'
    );
    // Anything that is not an in-app path, or not a network slug, is left be.
    expect(networkPath('https://etherscan.io/tx/0xabc', 'sepolia')).toBe(
      'https://etherscan.io/tx/0xabc'
    );
    expect(networkPath('/blocks', '../evil')).toBe('/blocks');
  });

  it('strips a known network segment back off a path', () => {
    const known = ['mainnet', 'sepolia', 'hoodi'];
    expect(stripNetworkPath('/sepolia/block/123', known)).toBe('/block/123');
    expect(stripNetworkPath('/sepolia', known)).toBe('/');
    expect(stripNetworkPath('/Sepolia/blocks', known)).toBe('/blocks');
    // A first segment that is a page, not a network, stays put.
    expect(stripNetworkPath('/blocks', known)).toBe('/blocks');
    expect(stripNetworkPath('/', known)).toBe('/');
  });

  it('truncates transaction hashes from both ends', () => {
    const hash = `0x${'ab'.repeat(32)}`;
    expect(truncateTxHash(hash)).toBe('0xabababab...abab');
    expect(truncateTxHash('0xabcdef')).toBe('0xabcdef');
  });

  it('normalizes cost fields to wei so they can be summed', () => {
    expect(costToWei('523396972544')).toBe(BigInt('523396972544'));
    // Decimal values are ETH by the indexer's convention.
    expect(costToWei('0.001')).toBe(BigInt('1000000000000000'));
    expect(costToWei('0')).toBe(BigInt(0));
    expect(costToWei('')).toBeNull();
    expect(costToWei(undefined)).toBeNull();
    expect(costToWei('not a number')).toBeNull();
  });

  it('labels explorer links with their host', () => {
    expect(explorerHostLabel('https://etherscan.io/tx/0xabc')).toBe('etherscan.io');
    expect(explorerHostLabel('https://www.blockscout.com/tx/0xabc')).toBe('blockscout.com');
    expect(explorerHostLabel('javascript:alert(1)')).toBeNull();
    expect(explorerHostLabel(undefined)).toBeNull();
  });

  it('builds fallback explorer transaction urls per network', () => {
    expect(explorerTxUrl('0xabc', 'mainnet')).toBe('https://etherscan.io/tx/0xabc');
    expect(explorerTxUrl('0xabc', 'sepolia')).toBe('https://sepolia.etherscan.io/tx/0xabc');
    expect(explorerTxUrl('0xabc')).toBe('https://etherscan.io/tx/0xabc');
    expect(explorerTxUrl('0xabc', 'holesky')).toBeNull();
  });

  it('maps known network names to vendored registry icons', () => {
    expect(getNetworkIconSrc('Arbitrum One')).toBe('/images/entities/arbitrum.svg');
    expect(getNetworkIconSrc('OP Mainnet')).toBe('/images/entities/optimism.svg');
    expect(getNetworkIconSrc('World Chain')).toBe('/images/entities/world-chain.svg');
    expect(getNetworkIconSrc('Not A Network')).toBeNull();
  });

  it('formats dates in short US format', () => {
    const value = formatDate(new Date(2025, 0, 15));
    expect(value).toBe('Jan 15, 2025');
  });

  it('formats wei values with appropriate unit', () => {
    expect(formatWeiToReadable('500')).toBe('500 Wei');
    expect(formatWeiToReadable('4878649006.97818347')).toBe('4.87864900697818347 Gwei');
    expect(formatWeiToReadable('0.001')).toBe('0.001 Wei');
    expect(formatWeiToReadable('1000000000')).toBe('1 Gwei');
    expect(formatWeiToReadable('5014755072.74762611')).toBe('5.01475507274762611 Gwei');
    expect(formatWeiToReadable('1000000000000000000')).toBe('1 ETH');
  });

  it('formats wei values explicitly as ETH', () => {
    expect(formatWeiToEth('500000000000000')).toBe('0.0005 ETH');
    expect(formatWeiToEth('9065041362944', true)).toBe('0.000009 ETH');
    expect(formatWeiToEth('2203603226459001.927')).toBe('0.002203603226459001927 ETH');
  });

  it('formats decimal ETH costs and integer wei costs', () => {
    expect(formatCostEthOrWei('0.001')).toBe('0.001 ETH');
    expect(formatCostEthOrWei('1000000000')).toBe('1 Gwei');
    // Large wei costs render as ETH instead of tens of millions of Gwei.
    expect(formatCostEthOrWei('47031169918042112')).toBe('0.047031 ETH');
    expect(formatCostEthOrWei('1000000000000000000')).toBe('1 ETH');
    // Sub-Gwei costs stay in Wei.
    expect(formatCostEthOrWei('500')).toBe('500 Wei');
    // Decimal ETH costs are capped to a readable precision.
    expect(formatCostEthOrWei('0.047031169918042112')).toBe('0.047031 ETH');
    // Small decimal ETH costs fall back to Gwei/Wei instead of rounding to 0.
    expect(formatCostEthOrWei('0.0000001')).toBe('100 Gwei');
    expect(formatCostEthOrWei('0.000000000000000001')).toBe('1 Wei');
    // Equal costs render identically whether given as decimal ETH or integer wei.
    expect(formatCostEthOrWei('0.047031169918042112')).toBe(
      formatCostEthOrWei('47031169918042112')
    );
  });

  it('rejects invalid decimal values', () => {
    expect(() => formatWeiToReadable('abc')).toThrow('Invalid decimal value');
  });

  it('maps known attribution names to vendored registry icons', () => {
    expect(getAttributionImageSrc('OP Mainnet')).toBe('/images/entities/optimism.svg');
    expect(getAttributionImageSrc('Arbitrum One')).toBe('/images/entities/arbitrum.svg');
    expect(getAttributionImageSrc('Robinhood Chain')).toBe(
      '/images/entities/robinhood-chain.svg'
    );
    expect(getAttributionImageSrc('Taiko')).toBe('/images/entities/taiko.png');
    expect(getAttributionImageSrc('An Unknown Rollup')).toBeNull();
    expect(getAttributionInitial('Taiko')).toBe('T');
  });

  it('keeps legacy short attribution names working via aliases', () => {
    expect(getAttributionImageSrc('Arbitrum')).toBe('/images/entities/arbitrum.svg');
    expect(getAttributionImageSrc('Optimism')).toBe('/images/entities/optimism.svg');
    expect(getAttributionImageSrc('zkSync')).toBe('/images/entities/zksync-era.svg');
  });

  it('asks for a light backdrop only where a dark logo is see-through', () => {
    // Dark artwork on a transparent field: a backdrop shows through it.
    expect(attributionNeedsLightBackdrop('Linea')).toBe(true);
    expect(attributionNeedsLightBackdrop('ADI Chain')).toBe(true);
    // Dark but opaque, so a backdrop would be hidden behind the artwork.
    expect(attributionNeedsLightBackdrop('Shape')).toBe(false);
    expect(attributionNeedsLightBackdrop('X Layer')).toBe(false);
    // See-through but legible on its own.
    expect(attributionNeedsLightBackdrop('Taiko')).toBe(false);
    expect(attributionNeedsLightBackdrop('An Unknown Rollup')).toBe(false);
  });

  it('labels testnet entities and leaves mainnet entities unlabeled', () => {
    expect(getAttributionTestnetLabel('Robinhood Chain Testnet')).toBe('Sepolia');
    expect(getAttributionTestnetLabel('OP Sepolia Testnet')).toBe('Sepolia');
    expect(getAttributionTestnetLabel('Robinhood Chain')).toBeNull();
    expect(getAttributionTestnetLabel('An Unknown Rollup')).toBeNull();
  });

  it('labels unknown senders from the selected network', () => {
    expect(getAttributionTestnetLabel('An Unknown Rollup', NETWORKS.SEPOLIA)).toBe('Sepolia');
    expect(getAttributionTestnetLabel('An Unknown Rollup', NETWORKS.MAINNET)).toBeNull();
    // The registry stays authoritative for known entities; the network only
    // fills in for senders it does not know.
    expect(getAttributionTestnetLabel('Robinhood Chain', NETWORKS.SEPOLIA)).toBeNull();
    expect(getAttributionTestnetLabel('OP Sepolia Testnet', NETWORKS.MAINNET)).toBe('Sepolia');
  });

  it('dedupes testnet labels across an icon cluster', () => {
    expect(
      getAttributionTestnetLabels([
        'Robinhood Chain Testnet',
        'OP Sepolia Testnet',
        'Robinhood Chain',
        'An Unknown Rollup',
      ])
    ).toEqual(['Sepolia']);
    expect(getAttributionTestnetLabels(['Robinhood Chain'])).toEqual([]);
    expect(
      getAttributionTestnetLabels(
        ['OP Sepolia Testnet', 'An Unknown Rollup'],
        NETWORKS.SEPOLIA
      )
    ).toEqual(['Sepolia']);
  });

  it('builds a prefilled blob-list suggestion URL with a checksummed address', () => {
    const url = getAttributionSuggestionUrl(
      '0x000000633b68f5d8d3a86593ebb815b4663bcbe0',
      'mainnet'
    );
    expect(url?.startsWith('https://github.com/tirante-dev/blob-list/new/main?')).toBe(true);

    const params = new URL(url ?? '').searchParams;
    expect(params.get('filename')).toBe('entities/your-entity-id.yaml');

    const template = params.get('value') ?? '';
    expect(template).toContain('address: "0x000000633b68f5D8D3a86593ebB815b4663BCBe0"');
    expect(template).toContain('submission_chain: eip155-1');
    expect(template).toContain(
      'url: https://etherscan.io/address/0x000000633b68f5D8D3a86593ebB815b4663BCBe0'
    );
  });

  it('targets the sepolia chain and explorer for sepolia suggestions', () => {
    const url = getAttributionSuggestionUrl(
      '0x000000633b68f5d8d3a86593ebb815b4663bcbe0',
      'sepolia'
    );
    const template = new URL(url ?? '').searchParams.get('value') ?? '';
    expect(template).toContain('submission_chain: eip155-11155111');
    expect(template).toContain('url: https://sepolia.etherscan.io/address/');
  });

  it('returns null for unparseable addresses instead of templating them', () => {
    expect(getAttributionSuggestionUrl('not-an-address')).toBeNull();
    expect(getAttributionSuggestionUrl('0x1234')).toBeNull();
    expect(
      getAttributionSuggestionUrl('0x1234\n  evil: yaml\n#', 'mainnet')
    ).toBeNull();
  });

  it('defaults to mainnet when no network is given', () => {
    const url = getAttributionSuggestionUrl('0x000000633b68f5d8d3a86593ebb815b4663bcbe0');
    const template = new URL(url ?? '').searchParams.get('value') ?? '';
    expect(template).toContain('submission_chain: eip155-1');
  });

  it('formats blob gas fees in gwei', () => {
    expect(formatWeiToGwei('9389122')).toBe('0.009389 Gwei');
    expect(formatWeiToGwei('1000000000')).toBe('1 Gwei');
    expect(formatGwei('0.008487503')).toBe('0.008488 Gwei');
  });

  it('collapses runaway blob fees to compact scientific notation', () => {
    // 1.2345...e29 wei == 1.2345...e20 Gwei: too large to spell out.
    expect(formatWeiToGwei('123456789012345678901234567890')).toBe('1.23e20 Gwei');
    // 2.838e31 wei == 2.838e22 Gwei, matching the observed Hoodi readout.
    expect(formatWeiToGwei('28380000000000000000000000000000')).toBe('2.84e22 Gwei');
    expect(formatGwei('28380000000000000000000')).toBe('2.84e22 Gwei');
    // Just below the 1e9 Gwei threshold stays in positional notation.
    expect(formatGwei('999999999')).toBe('999,999,999 Gwei');
    expect(formatGwei('1000000000')).toBe('1e9 Gwei');
  });

  it('formats durations and percentages compactly', () => {
    expect(formatDuration(20.7)).toBe('21 sec');
    expect(formatDuration(314.03)).toBe('5 min');
    expect(formatDuration(5400)).toBe('1.5 hr');
    expect(formatPercent(35.7143)).toBe('35.7%');
  });

  it('formats blob sizes, counts, utilization, and fee headroom', () => {
    expect(formatBlobSize(131072)).toBe('128 KB');
    expect(getBlobCount(262144)).toBe(2);
    expect(getBlobCount(undefined, 262144)).toBe(2);
    expect(getBlobCount(131073)).toBe(2);
    expect(getBlobCount(undefined, 131073)).toBe(2);
    expect(formatBlobCount(2)).toBe('2 blobs');
    expect(formatUtilizationPercent(9.52)).toBe('9.52%');
    expect(formatFeeHeadroom('93.083922')).toBe('93.1%');
  });

  it('formats enriched blob fees and costs', () => {
    expect(formatBlobFee('0.008487503')).toBe('0.008488 Gwei');
    expect(formatBlobFee(undefined, '1000000000')).toBe('1 Gwei');
    expect(formatBlobWeiCost('9065041362944')).toBe('9,065.0414 Gwei');
    expect(formatBlobWeiCost('500')).toBe('500 Wei');
    // A decimal-shaped wei value stays interpreted as wei, not reinterpreted
    // as ETH (which would overstate it by 1e18).
    expect(formatBlobWeiCost('1000000000.000000000000000000')).toBe('1 Gwei');
    expect(formatBlobTotalCost('0.001')).toBe('0.001 ETH');
    expect(formatBlobTotalCost('9065041362944')).toBe('9,065.0414 Gwei');
  });
});

describe('parseSearchQuery', () => {
  const address = '0x1234567890abcdef1234567890abcdef12345678';
  const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

  it('parses a bare block number', () => {
    expect(parseSearchQuery('25467750')).toEqual({ kind: 'block', blockNumber: '25467750' });
  });

  it('parses block numbers with prefix, commas, and whitespace', () => {
    expect(parseSearchQuery('block:25467750')).toEqual({ kind: 'block', blockNumber: '25467750' });
    expect(parseSearchQuery('BLOCK: 25,467,750')).toEqual({ kind: 'block', blockNumber: '25467750' });
    expect(parseSearchQuery('  25467750  ')).toEqual({ kind: 'block', blockNumber: '25467750' });
  });

  it('parses addresses bare and with the rollup prefix', () => {
    expect(parseSearchQuery(address)).toEqual({ kind: 'address', address });
    expect(parseSearchQuery(`rollup:${address.toUpperCase().replace('0X', '0x')}`)).toEqual({
      kind: 'address',
      address,
    });
  });

  it('parses transaction hashes bare and with the tx prefix', () => {
    expect(parseSearchQuery(txHash)).toEqual({ kind: 'transaction', txHash });
    expect(parseSearchQuery(`tx:${txHash}`)).toEqual({ kind: 'transaction', txHash });
  });

  it('parses 0x01-prefixed hashes as blob versioned hashes', () => {
    const blobHash = `0x01${'ab'.repeat(31)}`;
    expect(parseSearchQuery(blobHash)).toEqual({ kind: 'blob', versionedHash: blobHash });
    expect(parseSearchQuery(`blob:${blobHash}`)).toEqual({ kind: 'blob', versionedHash: blobHash });
    // An explicit tx: prefix overrides the version-byte heuristic.
    expect(parseSearchQuery(`tx:${blobHash}`)).toEqual({ kind: 'transaction', txHash: blobHash });
    // blob: requires a plausible versioned hash.
    expect(parseSearchQuery(`blob:${txHash}`)).toBeNull();
  });

  it('rejects values that do not match their prefix', () => {
    expect(parseSearchQuery(`block:${txHash}`)).toBeNull();
    expect(parseSearchQuery('tx:25467750')).toBeNull();
    expect(parseSearchQuery(`rollup:${txHash}`)).toBeNull();
  });

  it('rejects unknown prefixes, empty values, and free text', () => {
    expect(parseSearchQuery('http://example.com')).toBeNull();
    expect(parseSearchQuery('block:')).toBeNull();
    expect(parseSearchQuery('')).toBeNull();
    expect(parseSearchQuery('recent rollup blob activity')).toBeNull();
    expect(parseSearchQuery('0')).toBeNull();
    expect(parseSearchQuery('0x1234')).toBeNull();
  });
});

describe('assignSeriesColors', () => {
  // The live mainnet attribution series as of 2026-07.
  const mainnetSeries = [
    { key: 'arbitrum_one', category: 'rollup' },
    { key: 'op_mainnet', category: 'rollup' },
    { key: 'base', category: 'rollup' },
    { key: 'robinhood_chain', category: 'rollup' },
    { key: 'world_chain', category: 'rollup' },
    { key: 'other', category: 'other' },
    { key: 'unknown', category: 'unknown' },
  ];

  it('gives every series a color and all colors are distinct when they fit the palette', () => {
    const colors = assignSeriesColors(mainnetSeries);
    const values = mainnetSeries.map((s) => colors[s.key]);
    expect(values.every((c) => /^#[0-9a-f]{6}$/i.test(c))).toBe(true);
    expect(new Set(values).size).toBe(mainnetSeries.length);
  });

  it('assigns the fixed neutrals to the other and unknown categories', () => {
    const colors = assignSeriesColors(mainnetSeries);
    expect(colors.other).toBe('#c2c8d0');
    expect(colors.unknown).toBe('#747781');
    expect(colors.other).not.toBe(colors.unknown);
  });

  it('falls back to the key for neutrals when no category is provided', () => {
    // Surfaces without category data (like the top users table) must still
    // render an entry keyed unknown/other as the neutral, not a network hue.
    const colors = assignSeriesColors([{ key: 'unknown' }, { key: 'other' }]);
    expect(colors.unknown).toBe('#747781');
    expect(colors.other).toBe('#c2c8d0');
  });

  it('treats an explicit category as authoritative over the key spelling', () => {
    const colors = assignSeriesColors([{ key: 'unknown', category: 'rollup' }]);
    expect(colors.unknown).not.toBe('#747781');
    expect(colors.unknown).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('is independent of input order', () => {
    const shuffled = [...mainnetSeries].reverse();
    expect(assignSeriesColors(shuffled)).toEqual(assignSeriesColors(mainnetSeries));
  });

  it('handles arbitrary new keys without configuration', () => {
    const colors = assignSeriesColors([
      { key: 'some_future_rollup', category: 'rollup' },
      { key: 'another_l2' },
    ]);
    expect(colors.some_future_rollup).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.another_l2).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.some_future_rollup).not.toBe(colors.another_l2);
  });

  it('still returns a color for every key when there are more series than palette slots', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ key: `rollup_${i}` }));
    const colors = assignSeriesColors(many);
    for (const { key } of many) {
      expect(colors[key]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('attributionColorKey', () => {
  it('normalizes display names to backend series key format', () => {
    expect(attributionColorKey('Arbitrum One')).toBe('arbitrum_one');
    expect(attributionColorKey('OP Mainnet')).toBe('op_mainnet');
    expect(attributionColorKey('Base')).toBe('base');
    expect(attributionColorKey('Robinhood Chain')).toBe('robinhood_chain');
    expect(attributionColorKey('  X Layer  ')).toBe('x_layer');
  });
});

describe('deriveBeaconSlot', () => {
  it('maps the mainnet beacon genesis timestamp to slot 0', () => {
    expect(deriveBeaconSlot('2020-12-01T12:00:23Z', 'mainnet')).toBe(0);
  });

  it('advances one slot every 12 seconds on mainnet', () => {
    expect(deriveBeaconSlot('2020-12-01T12:00:35Z', 'mainnet')).toBe(1);
    expect(deriveBeaconSlot('2020-12-01T12:20:23Z', 'mainnet')).toBe(100);
  });

  it('maps the sepolia beacon genesis timestamp to slot 0', () => {
    expect(deriveBeaconSlot('2022-06-20T14:00:00Z', 'sepolia')).toBe(0);
    expect(deriveBeaconSlot('2022-06-20T14:00:12Z', 'sepolia')).toBe(1);
  });

  it('is case-insensitive about the network name', () => {
    expect(deriveBeaconSlot('2020-12-01T12:00:23Z', 'Mainnet')).toBe(0);
  });

  it('floors timestamps that fall inside a slot', () => {
    expect(deriveBeaconSlot('2020-12-01T12:00:30Z', 'mainnet')).toBe(0);
  });

  it('returns null for networks without a known beacon genesis', () => {
    expect(deriveBeaconSlot('2024-01-01T00:00:00Z', 'holesky')).toBeNull();
  });

  it('returns null for pre-genesis and unparseable timestamps', () => {
    expect(deriveBeaconSlot('2020-01-01T00:00:00Z', 'mainnet')).toBeNull();
    expect(deriveBeaconSlot('not-a-date', 'mainnet')).toBeNull();
  });
});

describe('beaconSlotForBlob', () => {
  const base = { timestamp: '2020-12-01T12:20:23Z', network_name: 'mainnet' };

  it('prefers the indexer-provided slot over derivation', () => {
    expect(beaconSlotForBlob({ ...base, slot: 999 })).toBe(999);
    expect(beaconSlotForBlob({ ...base, slot: 0 })).toBe(0);
  });

  it('falls back to timestamp derivation when slot is absent or invalid', () => {
    expect(beaconSlotForBlob(base)).toBe(100);
    expect(beaconSlotForBlob({ ...base, slot: -1 })).toBe(100);
    expect(beaconSlotForBlob({ ...base, slot: 1.5 })).toBe(100);
  });

  it('returns null when neither slot nor a derivable timestamp exists', () => {
    expect(
      beaconSlotForBlob({ timestamp: 'not-a-date', network_name: 'holesky' })
    ).toBeNull();
  });
});

describe('buildTweetIntentUrl', () => {
  it('prefills the tweet with title, stat, and deep link', () => {
    const url = buildTweetIntentUrl({
      title: 'Blob Usage over 1h view',
      stat: '1,234 blobs posted on Mainnet',
      url: 'https://blobflow.example/charts/blob-usage',
    });

    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://twitter.com/intent/tweet');
    expect(parsed.searchParams.get('text')).toBe(
      'Blob Usage over 1h view: 1,234 blobs posted on Mainnet'
    );
    expect(parsed.searchParams.get('url')).toBe(
      'https://blobflow.example/charts/blob-usage'
    );
  });

  it('omits the stat clause when no headline stat is available', () => {
    const url = buildTweetIntentUrl({
      title: 'Rolling Market Stats',
      stat: null,
      url: 'https://blobflow.example/charts/rolling-market-stats',
    });

    expect(new URL(url).searchParams.get('text')).toBe('Rolling Market Stats');
  });
});

describe('chartImageFileName', () => {
  const capturedAt = new Date(2026, 7, 2, 9, 5);

  it('slugs the title and appends a sortable local timestamp', () => {
    expect(chartImageFileName('Blob vs Calldata Cost (1h view)', capturedAt)).toBe(
      'blob-flow-blob-vs-calldata-cost-1h-view-20260802-0905.png'
    );
  });

  it('falls back to a generic slug when the title has no usable characters', () => {
    expect(chartImageFileName('***', capturedAt)).toBe(
      'blob-flow-chart-20260802-0905.png'
    );
  });
});

describe('parseTimeRange', () => {
  it('accepts every range the header offers', () => {
    expect(TIME_RANGES.map((range) => parseTimeRange(range))).toEqual([...TIME_RANGES]);
  });

  it('falls back rather than passing an untrusted value through', () => {
    expect(parseTimeRange('7 days')).toBe('1h');
    expect(parseTimeRange(null)).toBe('1h');
    expect(parseTimeRange(undefined, '24h')).toBe('24h');
    expect(parseTimeRange('nonsense', '24h')).toBe('24h');
  });

  it('narrows the type for valid ranges only', () => {
    expect(isTimeRange('30d')).toBe(true);
    expect(isTimeRange('30D')).toBe(false);
    expect(isTimeRange(30)).toBe(false);
  });
});

describe('runaway gwei values', () => {
  // A congested testnet drives the blob base fee into exponent range, where
  // Number.toString() switches notation. Charts hand these in as numbers.
  it('formats numeric runaway fees in scientific notation instead of throwing', () => {
    expect(formatGwei(2.838e22, 4)).toBe('2.84e22 Gwei');
    expect(formatGwei(1e21, 4)).toBe('1e21 Gwei');
    expect(formatGwei(1e9, 4)).toBe('1e9 Gwei');
  });

  it('leaves ordinary numeric fees in positional form', () => {
    expect(formatGwei(12.34, 4)).toBe('12.34 Gwei');
    expect(formatGwei(0.000001234, 6)).toBe('0.000001 Gwei');
  });

  it('still rejects values that are not decimals', () => {
    expect(() => formatGwei(Number.NaN)).toThrow('Invalid decimal value');
    expect(() => formatGwei(Number.POSITIVE_INFINITY)).toThrow('Invalid decimal value');
    expect(() => formatGwei(-5)).toThrow('Invalid decimal value');
  });
});

describe('computeCostPerMibWei', () => {
  it('divides the total wei cost by the window blob payload', () => {
    // 8 blobs carry exactly 1 MiB, so cost per MiB equals the total cost.
    expect(computeCostPerMibWei(8, '1000000000000000000')).toBe(BigInt('1000000000000000000'));
    // 16 blobs carry 2 MiB, halving the per-MiB cost.
    expect(computeCostPerMibWei(16, '1000000000000000000')).toBe(BigInt('500000000000000000'));
  });

  it('keeps exact precision for totals beyond Number range', () => {
    expect(computeCostPerMibWei(8, '123456789012345678901234567890')).toBe(
      BigInt('123456789012345678901234567890')
    );
  });

  it('truncates fractional wei totals instead of misreading them', () => {
    expect(computeCostPerMibWei(8, '1000.9')).toBe(BigInt(1000));
  });

  it('falls back to total_cost_eth with the decimal-means-ETH heuristic', () => {
    // 4 blobs carry 0.5 MiB, so 0.5 ETH total is 1 ETH per MiB.
    expect(computeCostPerMibWei(4, undefined, '0.5')).toBe(BigInt('1000000000000000000'));
    // Integer strings in the eth field are wei from older backends.
    expect(computeCostPerMibWei(8, undefined, '1000000000000000000')).toBe(
      BigInt('1000000000000000000')
    );
  });

  it('returns null for zero blobs, missing cost, or malformed input', () => {
    expect(computeCostPerMibWei(0, '1000')).toBeNull();
    expect(computeCostPerMibWei(-3, '1000')).toBeNull();
    expect(computeCostPerMibWei(2.5, '1000')).toBeNull();
    expect(computeCostPerMibWei(NaN, '1000')).toBeNull();
    expect(computeCostPerMibWei(8)).toBeNull();
    expect(computeCostPerMibWei(8, '')).toBeNull();
    expect(computeCostPerMibWei(8, 'abc')).toBeNull();
    expect(computeCostPerMibWei(8, undefined, 'abc')).toBeNull();
    expect(computeCostPerMibWei(8, undefined, '-1.5')).toBeNull();
  });
});

describe('computeSecondsPerBlob', () => {
  it('averages the window duration across its blobs', () => {
    expect(computeSecondsPerBlob(7200, 86400)).toBe(12);
    expect(computeSecondsPerBlob(1, 5)).toBe(5);
  });

  it('returns null without blobs or a positive duration', () => {
    expect(computeSecondsPerBlob(0, 86400)).toBeNull();
    expect(computeSecondsPerBlob(-5, 86400)).toBeNull();
    expect(computeSecondsPerBlob(NaN, 86400)).toBeNull();
    expect(computeSecondsPerBlob(100, 0)).toBeNull();
    expect(computeSecondsPerBlob(100, -60)).toBeNull();
    expect(computeSecondsPerBlob(100, NaN)).toBeNull();
  });
});

describe('formatBlobCadence', () => {
  it('renders sub-minute intervals in seconds', () => {
    expect(formatBlobCadence(1.34)).toBe('1.3s');
    expect(formatBlobCadence(45)).toBe('45s');
  });

  it('clamps sub-tenth intervals instead of showing 0s', () => {
    expect(formatBlobCadence(0.04)).toBe('<0.1s');
  });

  it('delegates minute-plus intervals to formatDuration', () => {
    expect(formatBlobCadence(90)).toBe('2 min');
    expect(formatBlobCadence(7200)).toBe('2 hr');
  });

  it('renders a placeholder for missing or invalid cadence', () => {
    expect(formatBlobCadence(null)).toBe('-');
    expect(formatBlobCadence(0)).toBe('-');
    expect(formatBlobCadence(-3)).toBe('-');
    expect(formatBlobCadence(Infinity)).toBe('-');
  });
});

describe('blobCountToBytes', () => {
  it('multiplies by the 128 KiB blob payload', () => {
    expect(blobCountToBytes(1)).toBe(131072);
    expect(blobCountToBytes(8)).toBe(1048576);
  });

  it('maps malformed counts to zero bytes', () => {
    expect(blobCountToBytes(0)).toBe(0);
    expect(blobCountToBytes(-4)).toBe(0);
    expect(blobCountToBytes(NaN)).toBe(0);
  });
});

describe('formatDataVolume', () => {
  it('adds GB and TB tiers above formatBlobSize', () => {
    expect(formatDataVolume(1073741824)).toBe('1 GB');
    expect(formatDataVolume(1073741824 * 1.5)).toBe('1.5 GB');
    expect(formatDataVolume(1099511627776)).toBe('1 TB');
    expect(formatDataVolume(1099511627776 * 2.25)).toBe('2.25 TB');
  });

  it('falls through to formatBlobSize below a GB', () => {
    expect(formatDataVolume(1048576)).toBe('1 MB');
    expect(formatDataVolume(131072)).toBe('128 KB');
  });

  it('renders a placeholder for empty or invalid volumes', () => {
    expect(formatDataVolume(0)).toBe('-');
    expect(formatDataVolume(-1)).toBe('-');
    expect(formatDataVolume(NaN)).toBe('-');
  });
});

describe('computeBlobBytesPerSecond', () => {
  it('spreads the window blob payload across its duration', () => {
    // 8 blobs carry 1 MiB; over 2 seconds that is 512 KiB/s.
    expect(computeBlobBytesPerSecond(8, 2)).toBe(524288);
    expect(computeBlobBytesPerSecond(1, 131072)).toBe(1);
  });

  it('returns null without blobs or a positive duration', () => {
    expect(computeBlobBytesPerSecond(0, 3600)).toBeNull();
    expect(computeBlobBytesPerSecond(-5, 3600)).toBeNull();
    expect(computeBlobBytesPerSecond(NaN, 3600)).toBeNull();
    expect(computeBlobBytesPerSecond(100, 0)).toBeNull();
    expect(computeBlobBytesPerSecond(100, -60)).toBeNull();
    expect(computeBlobBytesPerSecond(100, NaN)).toBeNull();
  });
});

describe('formatDataRate', () => {
  it('appends /s to the tiered volume rendering', () => {
    expect(formatDataRate(262144)).toBe('256 KB/s');
    expect(formatDataRate(1048576)).toBe('1 MB/s');
    expect(formatDataRate(1073741824 * 1.5)).toBe('1.5 GB/s');
  });

  it('renders a placeholder for missing or invalid rates', () => {
    expect(formatDataRate(null)).toBe('-');
    expect(formatDataRate(0)).toBe('-');
    expect(formatDataRate(-1)).toBe('-');
    expect(formatDataRate(Infinity)).toBe('-');
  });
});

describe('formatDataComparison', () => {
  const MB = 1024 * 1024;
  const GB = MB * 1024;
  const TB = GB * 1024;

  it('renders a comparison with a count for the volume', () => {
    // A floppy disk is the first pool entry, so seed 0 lands on it.
    expect(formatDataComparison(200 * MB, 0)).toBe('139 floppy disks');
  });

  it('walks the pool as the seed advances and wraps around', () => {
    const first = formatDataComparison(200 * MB, 0);
    const second = formatDataComparison(200 * MB, 1);
    expect(second).not.toBe(first);

    // Mirrors the picker's own eligibility rules: the comparison must fit
    // inside the volume, and its count must stay under a million.
    const poolSize = DATA_COMPARISONS.filter(
      (comparison) =>
        (200 * MB) / comparison.bytes >= 1 &&
        (200 * MB) / comparison.bytes <= 1_000_000
    ).length;
    expect(formatDataComparison(200 * MB, poolSize)).toBe(first);
  });

  it('never picks a comparison larger than the volume', () => {
    // 2 MB is smaller than a DVD, a Blu-ray, or Wikipedia, so no seed may
    // land on one and render a fractional "0.5 DVDs" caption. Sweeping a
    // range of volumes catches entries that only just overshoot.
    for (const bytes of [300, 2 * MB, 176.3 * MB, 3 * GB, 9 * TB]) {
      for (let seed = 0; seed < 120; seed += 1) {
        const result = formatDataComparison(bytes, seed);
        expect(result).not.toBeNull();
        const count = Number.parseFloat(result ?? '');
        expect(count).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('keeps a decimal below ten and rounds above it', () => {
    // 1.44 MB per floppy: 3 MB is a fractional handful of disks.
    expect(formatDataComparison(3 * MB, 0)).toBe('2.1 floppy disks');
    expect(formatDataComparison(200 * MB, 0)).toBe('139 floppy disks');
  });

  it('uses the singular form only for an exact count of one', () => {
    expect(formatDataComparison(1.44 * MB, 0)).toBe('1 floppy disk');
    // English pluralizes anything that is not exactly one.
    expect(formatDataComparison(1.6 * MB, 0)).toBe('1.1 floppy disks');
  });

  it('compacts very large counts', () => {
    expect(formatDataComparison(500 * 1024 * MB, 0)).toBe('356K floppy disks');
  });

  it('reaches for byte-scale comparisons on tiny volumes', () => {
    // Only the punch card, tweet, text message and emoji fit in 300 bytes.
    expect(formatDataComparison(300, 0)).toBe('3.8 punch cards');
    expect(formatDataComparison(300, 1)).toBe('1.1 tweets');
  });

  it('accepts million-plus counts when nothing smaller fits', () => {
    // Past this scale even the largest comparison in the pool runs into the
    // millions, so the readability ceiling gives way rather than returning null.
    const result = formatDataComparison(1e20, 0);
    expect(result).not.toBeNull();
    expect(result).toContain('floppy disks');
  });

  it('is stable for a given volume and seed', () => {
    expect(formatDataComparison(200 * MB, 7)).toBe(formatDataComparison(200 * MB, 7));
  });

  it('tolerates negative and non-finite seeds', () => {
    expect(formatDataComparison(200 * MB, -1)).not.toBeNull();
    expect(formatDataComparison(200 * MB, NaN)).toBe(formatDataComparison(200 * MB, 0));
    expect(formatDataComparison(200 * MB, 2.9)).toBe(formatDataComparison(200 * MB, 2));
  });

  it('returns null for empty or invalid volumes', () => {
    expect(formatDataComparison(0, 0)).toBeNull();
    expect(formatDataComparison(-1, 0)).toBeNull();
    expect(formatDataComparison(NaN, 0)).toBeNull();
    // Smaller than the smallest comparison in the pool (a 4-byte emoji).
    expect(formatDataComparison(1, 0)).toBeNull();
  });
});

describe('DATA_COMPARISONS registry', () => {
  it('offers a hundred comparisons', () => {
    expect(DATA_COMPARISONS).toHaveLength(100);
  });

  it('gives every entry a positive size and both grammatical forms', () => {
    for (const comparison of DATA_COMPARISONS) {
      expect(comparison.bytes).toBeGreaterThan(0);
      expect(comparison.singular.length).toBeGreaterThan(0);
      expect(comparison.plural.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate labels', () => {
    const labels = DATA_COMPARISONS.map((comparison) => comparison.plural);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('formatSignedWeiToEth', () => {
  it('formats positive and negative wei as compact ETH', () => {
    expect(formatSignedWeiToEth('1000000000000000000')).toBe('1 ETH');
    expect(formatSignedWeiToEth('-500000000000000000')).toBe('-0.5 ETH');
  });

  it('truncates fractional wei', () => {
    expect(formatSignedWeiToEth('1500000000000000000.75')).toBe('1.5 ETH');
  });

  it('collapses zero and negative zero to 0 ETH', () => {
    expect(formatSignedWeiToEth('0')).toBe('0 ETH');
    expect(formatSignedWeiToEth('-0')).toBe('0 ETH');
  });

  it('returns null for missing or malformed values', () => {
    expect(formatSignedWeiToEth(undefined)).toBeNull();
    expect(formatSignedWeiToEth('')).toBeNull();
    expect(formatSignedWeiToEth('abc')).toBeNull();
    expect(formatSignedWeiToEth('--5')).toBeNull();
  });
});

describe('selectTopUsageShare', () => {
  const makeShare = (
    key: string,
    category: string,
    blobCount: number
  ): BackendAttributionUsageShare => ({
    key,
    name: key,
    category,
    blob_count: blobCount,
    total_cost_wei: '0',
    blob_share_percent: 0,
    spend_share_percent: 0,
  });

  it('picks the named entity with the most blobs', () => {
    const shares = [
      makeShare('base', 'rollup', 500),
      makeShare('arbitrum', 'rollup', 900),
      makeShare('optimism', 'rollup', 700),
    ];
    expect(selectTopUsageShare(shares)?.key).toBe('arbitrum');
  });

  it('never crowns the neutral other/unknown buckets', () => {
    const shares = [
      makeShare('unknown', 'unknown', 5000),
      makeShare('leftovers', 'Other', 4000),
      makeShare('base', 'rollup', 900),
    ];
    expect(selectTopUsageShare(shares)?.key).toBe('base');
  });

  it('returns null when no named entity posted blobs', () => {
    expect(selectTopUsageShare([])).toBeNull();
    expect(selectTopUsageShare([makeShare('unknown', 'unknown', 5000)])).toBeNull();
    expect(selectTopUsageShare([makeShare('base', 'rollup', 0)])).toBeNull();
  });
});

describe('durationSecondsBetween', () => {
  it('measures the span between two timestamps', () => {
    expect(
      durationSecondsBetween('2026-01-01T00:00:00Z', '2026-01-01T01:00:00Z')
    ).toBe(3600);
  });

  it('returns null for reversed, equal, or unparseable timestamps', () => {
    expect(
      durationSecondsBetween('2026-01-01T01:00:00Z', '2026-01-01T00:00:00Z')
    ).toBeNull();
    expect(
      durationSecondsBetween('2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
    ).toBeNull();
    expect(durationSecondsBetween('not-a-date', '2026-01-01T00:00:00Z')).toBeNull();
  });
});
