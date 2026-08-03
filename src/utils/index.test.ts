import {
  assignSeriesColors,
  attributionColorKey,
  beaconSlotForBlob,
  blobCountToBytes,
  computeCostPerMibWei,
  computeSecondsPerBlob,
  deriveBeaconSlot,
  durationSecondsBetween,
  formatBlobCadence,
  formatBlobCount,
  formatBlobFee,
  formatBlobSize,
  formatBlobTotalCost,
  formatBlobWeiCost,
  formatCostEthOrWei,
  formatDataVolume,
  formatDate,
  formatDuration,
  formatFeeHeadroom,
  formatFloppyEquivalent,
  formatGwei,
  formatNumber,
  formatPercent,
  formatSignedWeiToEth,
  formatUtilizationPercent,
  formatWeiToGwei,
  formatWeiToEth,
  formatWeiToReadable,
  getAttributionImageSrc,
  getAttributionInitial,
  getAttributionSuggestionUrl,
  getAttributionTestnetLabel,
  getAttributionTestnetLabels,
  getBlobCount,
  getNetworkIconSrc,
  parseSearchQuery,
  safeExplorerUrl,
  selectTopUsageShare,
  truncateAddress,
} from './index';
import { NETWORKS } from '@/constants';
import type { BackendAttributionUsageShare } from '@/types';

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

describe('formatFloppyEquivalent', () => {
  it('counts 1.44 MB floppy disks', () => {
    expect(formatFloppyEquivalent(1474560)).toBe('1 floppy disk');
    expect(formatFloppyEquivalent(1073741824)).toBe('728 floppy disks');
  });

  it('compacts large counts', () => {
    expect(formatFloppyEquivalent(107374182400)).toBe('72.8K floppy disks');
  });

  it('returns null below one full disk', () => {
    expect(formatFloppyEquivalent(131072)).toBeNull();
    expect(formatFloppyEquivalent(0)).toBeNull();
    expect(formatFloppyEquivalent(NaN)).toBeNull();
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
