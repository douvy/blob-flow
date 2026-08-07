import {
  KIOSK_TICKER_BLOCKS,
  buildChartPoints,
  buildFocusTickerSlots,
  buildRollupBars,
  buildTickerSlots,
  describeKioskConnection,
  getBlockAgeSeconds,
  getFeeDirection,
  getFeeExtremes,
  getFullness,
  getPredictedDirection,
  summarizeKioskMempool,
} from './liveKiosk';
import type { MempoolAttributionSummary } from './mempoolAttribution';
import type { BlobResponse, Block, BlobPricingRecentBlock, User } from '../types';

function makeMempoolSummary(
  overrides: Partial<MempoolAttributionSummary> = {}
): MempoolAttributionSummary {
  return {
    txCount: 8,
    blobCount: 20,
    blobSizeBytes: 20 * 131072,
    uniqueSenderCount: 4,
    oldestTimestamp: '2026-01-01T00:00:00.000Z',
    groups: [],
    ...overrides,
  };
}

function makePricingBlock(overrides: Partial<BlobPricingRecentBlock> = {}): BlobPricingRecentBlock {
  return {
    blockNumber: 1000,
    blockTimestamp: '2026-01-01T00:00:00.000Z',
    blobCount: 3,
    blobGasUsed: 393216,
    blobGasTarget: 393216,
    blobGasLimit: 786432,
    excessBlobGas: 0,
    blobBaseFee: '0.25 Gwei',
    blobBaseFeeGwei: '0.25',
    utilizationRatio: 0.5,
    targetBlobs: 3,
    maxBlobs: 6,
    availableBlobs: 3,
    utilizationPercent: 50,
    isFull: false,
    isAboveTarget: false,
    ...overrides,
  };
}

function makeAttributedBlob(user: string | undefined): BlobResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    block_number: 1000,
    blob_index: 0,
    tx_hash: '0xabc',
    from_address: '0xsender',
    blob_size_bytes: 131072,
    base_fee_per_blob_gas: '250000000',
    tip_per_blob_gas: '0',
    total_cost_eth: '0',
    timestamp: '2026-01-01T00:00:00.000Z',
    confirmed: true,
    user_attribution: user,
  };
}

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: 1000,
    number: '1000',
    blobCount: 3,
    blobGasUsed: 393216,
    blobGasTarget: 393216,
    blobGasLimit: 786432,
    targetBlobs: 3,
    maxBlobs: 6,
    availableBlobs: 3,
    baseFeeGwei: '0.25',
    utilizationPercent: 50,
    isFull: false,
    isAboveTarget: false,
    timestamp: '2026-01-01T00:00:00.000Z',
    attribution: ['Base'],
    blobs: [],
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'Base',
    address: '0xabc',
    attributed: true,
    dataCount: 100,
    percentage: 40,
    totalCostEth: '1',
    lastTimestamp: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getFeeDirection', () => {
  it('reports rises and falls that clear the flat threshold', () => {
    expect(getFeeDirection(1.1, 1)).toBe('up');
    expect(getFeeDirection(0.9, 1)).toBe('down');
  });

  it('treats sub-threshold drift as flat so the arrow does not flicker each block', () => {
    expect(getFeeDirection(1.004, 1)).toBe('flat');
    expect(getFeeDirection(0.997, 1)).toBe('flat');
    expect(getFeeDirection(1, 1)).toBe('flat');
  });

  it('is flat when there is no usable baseline', () => {
    expect(getFeeDirection(1, null)).toBe('flat');
    expect(getFeeDirection(1, undefined)).toBe('flat');
    expect(getFeeDirection(1, 0)).toBe('flat');
    expect(getFeeDirection(0, 1)).toBe('flat');
    expect(getFeeDirection(Number.NaN, 1)).toBe('flat');
  });
});

describe('getPredictedDirection', () => {
  it('prefers the comparison against the displayed current fee', () => {
    expect(getPredictedDirection(1.2, 1, 'down')).toBe('up');
    expect(getPredictedDirection(0.8, 1, 'up')).toBe('down');
  });

  it('falls back to the backend direction when a fee is missing', () => {
    expect(getPredictedDirection(0, 1, 'up')).toBe('up');
    expect(getPredictedDirection(0, 0, 'DECREASING')).toBe('down');
    expect(getPredictedDirection(1, 0, 'stable')).toBe('flat');
    expect(getPredictedDirection(0, 0, undefined)).toBe('flat');
  });
});

describe('getFullness', () => {
  it('reads capacity off the newest block', () => {
    expect(getFullness(makePricingBlock({ blobCount: 6, maxBlobs: 6, utilizationPercent: 100, isFull: true }))).toEqual({
      percent: 100,
      blobCount: 6,
      maxBlobs: 6,
      isFull: true,
      isAboveTarget: false,
    });
  });

  it('clamps a malformed utilization instead of overflowing the gauge', () => {
    expect(getFullness(makePricingBlock({ utilizationPercent: 140 })).percent).toBe(100);
    expect(getFullness(makePricingBlock({ utilizationPercent: -5 })).percent).toBe(0);
    expect(getFullness(makePricingBlock({ utilizationPercent: Number.NaN })).percent).toBe(0);
  });

  it('reads as empty before any block has landed', () => {
    expect(getFullness(undefined).percent).toBe(0);
    expect(getFullness(undefined).isFull).toBe(false);
  });
});

describe('buildTickerSlots', () => {
  it('always returns the full slot count so the row never reflows', () => {
    expect(buildTickerSlots([], 5)).toHaveLength(5);
    expect(buildTickerSlots([makePricingBlock()], 5)).toHaveLength(5);
    expect(
      buildTickerSlots(
        Array.from({ length: 40 }, (_, index) => makePricingBlock({ blockNumber: 1000 + index })),
        5
      )
    ).toHaveLength(5);
  });

  it('pads the tail with placeholders and keeps the given block order', () => {
    const slots = buildTickerSlots(
      [makePricingBlock({ blockNumber: 20 }), makePricingBlock({ blockNumber: 19 })],
      4
    );

    expect(slots.map((slot) => slot.kind)).toEqual([
      'block',
      'block',
      'placeholder',
      'placeholder',
    ]);
    expect(slots[0]).toMatchObject({ blockNumber: 20, key: '20' });
    expect(slots[1]).toMatchObject({ blockNumber: 19, key: '19' });
  });

  it('carries fill, fee, and full state through for each block', () => {
    const [slot] = buildTickerSlots([
      makePricingBlock({
        blockNumber: 42,
        blobCount: 6,
        maxBlobs: 6,
        utilizationPercent: 100,
        blobBaseFeeGwei: '1.5',
        isFull: true,
        isAboveTarget: true,
      }),
    ]);

    expect(slot).toEqual({
      kind: 'block',
      key: '42',
      blockNumber: 42,
      blobCount: 6,
      maxBlobs: 6,
      fillPercent: 100,
      feeGwei: 1.5,
      isFull: true,
      isAboveTarget: true,
    });
  });

  it('defaults to the shared ticker width', () => {
    expect(buildTickerSlots([])).toHaveLength(KIOSK_TICKER_BLOCKS);
  });
});

describe('buildFocusTickerSlots', () => {
  it('counts the focused rollup blobs per block and their capacity share', () => {
    const [slot] = buildFocusTickerSlots(
      [
        makeBlock({
          number: '42',
          blobCount: 3,
          maxBlobs: 6,
          blobs: [
            makeAttributedBlob('Base'),
            makeAttributedBlob('Base'),
            makeAttributedBlob('Arbitrum'),
          ],
        }),
      ],
      'Base',
      1
    );

    expect(slot).toMatchObject({
      kind: 'block',
      blockNumber: 42,
      blobCount: 3,
      focus: { count: 2, percent: (2 / 6) * 100 },
    });
  });

  it('reports null rather than zero when blob details are missing', () => {
    const [withoutDetails] = buildFocusTickerSlots(
      [makeBlock({ blobCount: 4, blobs: [] })],
      'Base',
      1
    );
    expect(withoutDetails.kind === 'block' && withoutDetails.focus?.count).toBeNull();

    // A genuinely empty block is an honest zero, not an unknown.
    const [emptyBlock] = buildFocusTickerSlots(
      [makeBlock({ blobCount: 0, utilizationPercent: 0, blobs: [] })],
      'Base',
      1
    );
    expect(emptyBlock.kind === 'block' && emptyBlock.focus?.count).toBe(0);
  });

  it('does not credit unattributed blobs to any focus', () => {
    const [slot] = buildFocusTickerSlots(
      [makeBlock({ blobCount: 2, blobs: [makeAttributedBlob(undefined), makeAttributedBlob('Scroll')] })],
      'Base',
      1
    );
    expect(slot.kind === 'block' && slot.focus?.count).toBe(0);
  });

  it('pads to the fixed slot count like the unfocused builder', () => {
    const slots = buildFocusTickerSlots([makeBlock()], 'Base', 4);
    expect(slots.map((slot) => slot.kind)).toEqual([
      'block',
      'placeholder',
      'placeholder',
      'placeholder',
    ]);
  });
});

describe('buildRollupBars', () => {
  it('scales bars against the leader so the top row fills the track', () => {
    const bars = buildRollupBars([
      makeUser({ name: 'Base', percentage: 40, dataCount: 400 }),
      makeUser({ name: 'Arbitrum', percentage: 20, dataCount: 200 }),
      makeUser({ name: 'OP Mainnet', percentage: 10, dataCount: 100 }),
    ]);

    expect(bars.map((bar) => bar.barPercent)).toEqual([100, 50, 25]);
    expect(bars.map((bar) => bar.sharePercent)).toEqual([40, 20, 10]);
    expect(bars.every((bar) => !bar.isFocused)).toBe(true);
  });

  it('drops unattributed senders so a raw address is never called a rollup', () => {
    const bars = buildRollupBars([
      makeUser({ name: '0x12…34', attributed: false, dataCount: 500 }),
      makeUser({ name: 'Base', dataCount: 400 }),
      makeUser({ name: 'Arbitrum', dataCount: 200 }),
    ]);

    expect(bars.map((bar) => bar.name)).toEqual(['Base', 'Arbitrum']);
    // The dropped address must not skew the bar scale either.
    expect(bars.map((bar) => bar.barPercent)).toEqual([100, 50]);
  });

  it('reports no share percentage when the backend did not compute one', () => {
    const bars = buildRollupBars(
      [makeUser({ name: 'Base', percentage: 75, dataCount: 300 })],
      5,
      null,
      false
    );

    expect(bars[0].sharePercent).toBeNull();
    expect(bars[0].blobCount).toBe(300);
    // The bar still scales: it is relative to the leader either way.
    expect(bars[0].barPercent).toBe(100);
  });

  it('flags only the focused rollup', () => {
    const bars = buildRollupBars(
      [makeUser({ name: 'Base' }), makeUser({ name: 'Arbitrum' })],
      5,
      'Arbitrum'
    );

    expect(bars.map((bar) => bar.isFocused)).toEqual([false, true]);
  });

  it('respects the limit and survives an empty or all-zero window', () => {
    expect(buildRollupBars(undefined)).toEqual([]);
    expect(buildRollupBars([makeUser(), makeUser({ name: 'Arbitrum' })], 1)).toHaveLength(1);
    expect(buildRollupBars([makeUser({ dataCount: 0 })])[0].barPercent).toBe(0);
  });
});

describe('summarizeKioskMempool', () => {
  it('reports the backlog, what is priced in, and how long it takes to drain', () => {
    expect(summarizeKioskMempool(makeMempoolSummary(), 12, false, 6)).toEqual({
      pendingLabel: '20',
      includableLabel: '12 priced in',
      blocksToClearLabel: '2 blocks to clear',
      senderCount: 4,
      groups: [],
      isEmpty: false,
    });
  });

  it('caps the icon row at the largest senders, keeping the aggregation order', () => {
    const groups = ['Base', 'Arbitrum', 'OP Mainnet', 'zkSync', 'Scroll', 'Linea'].map(
      (user, index) => ({ user, txCount: 1, blobCount: 10 - index, blobSizeBytes: 0 })
    );

    const mempool = summarizeKioskMempool(makeMempoolSummary({ groups }), 12, false, 6);

    expect(mempool?.groups).toEqual([
      { name: 'Base', blobCount: 10 },
      { name: 'Arbitrum', blobCount: 9 },
      { name: 'OP Mainnet', blobCount: 8 },
      { name: 'zkSync', blobCount: 7 },
    ]);
  });

  it('marks every count as a lower bound when the sample is capped', () => {
    const mempool = summarizeKioskMempool(makeMempoolSummary({ blobCount: 50 }), 30, true, 6);

    expect(mempool).toMatchObject({
      pendingLabel: '50+',
      includableLabel: '30+ priced in',
      blocksToClearLabel: '5+ blocks to clear',
    });
  });

  it('says pricing is pending rather than claiming zero are includable', () => {
    const mempool = summarizeKioskMempool(makeMempoolSummary(), null, false, 6);

    expect(mempool?.includableLabel).toBe('pricing pending');
    expect(mempool?.blocksToClearLabel).toBeNull();
  });

  it('drops the drain estimate when block capacity is unknown', () => {
    expect(summarizeKioskMempool(makeMempoolSummary(), 12, false, 0)?.blocksToClearLabel).toBeNull();
  });

  it('singularizes a one-block backlog only when the count is exact', () => {
    expect(summarizeKioskMempool(makeMempoolSummary(), 4, false, 6)?.blocksToClearLabel).toBe(
      '1 block to clear'
    );
    expect(summarizeKioskMempool(makeMempoolSummary(), 4, true, 6)?.blocksToClearLabel).toBe(
      '1+ blocks to clear'
    );
  });

  it('flags an empty mempool and stays null until a sample loads', () => {
    expect(summarizeKioskMempool(makeMempoolSummary({ blobCount: 0 }), 0, false, 6)).toMatchObject({
      pendingLabel: '0',
      // Nothing priced in means no drain estimate, not "0 blocks to clear".
      blocksToClearLabel: null,
      isEmpty: true,
    });
    expect(summarizeKioskMempool(null, 12, false, 6)).toBeNull();
  });
});

describe('buildChartPoints', () => {
  it('reverses newest-first blocks into an oldest-first curve', () => {
    const points = buildChartPoints([
      makePricingBlock({ blockNumber: 102, blobBaseFeeGwei: '0.3' }),
      makePricingBlock({ blockNumber: 101, blobBaseFeeGwei: '0.2' }),
      makePricingBlock({ blockNumber: 100, blobBaseFeeGwei: '0.1' }),
    ]);

    expect(points).toEqual([
      { blockNumber: 100, fee: 0.1 },
      { blockNumber: 101, fee: 0.2 },
      { blockNumber: 102, fee: 0.3 },
    ]);
  });

  it('is empty for an empty window', () => {
    expect(buildChartPoints([])).toEqual([]);
  });

  it('drops malformed zero fees instead of plotting a plunge to the axis', () => {
    const points = buildChartPoints([
      makePricingBlock({ blockNumber: 102, blobBaseFeeGwei: '0.3' }),
      makePricingBlock({ blockNumber: 101, blobBaseFeeGwei: '0' }),
      makePricingBlock({ blockNumber: 100, blobBaseFeeGwei: '0.1' }),
    ]);

    expect(points).toEqual([
      { blockNumber: 100, fee: 0.1 },
      { blockNumber: 102, fee: 0.3 },
    ]);
  });
});

describe('getFeeExtremes', () => {
  it('reports the low, high, and mean of the plotted fees', () => {
    const extremes = getFeeExtremes([
      { blockNumber: 1, fee: 0.1 },
      { blockNumber: 2, fee: 0.3 },
      { blockNumber: 3, fee: 0.2 },
    ]);

    expect(extremes?.lowGwei).toBe(0.1);
    expect(extremes?.highGwei).toBe(0.3);
    expect(extremes?.averageGwei).toBeCloseTo(0.2);
  });

  it('skips malformed zero fees rather than faking a floor of 0', () => {
    const extremes = getFeeExtremes([
      { blockNumber: 1, fee: 0 },
      { blockNumber: 2, fee: 0.4 },
    ]);

    expect(extremes?.lowGwei).toBe(0.4);
  });

  it('is null when nothing is plottable', () => {
    expect(getFeeExtremes([])).toBeNull();
    expect(getFeeExtremes([{ blockNumber: 1, fee: 0 }])).toBeNull();
  });
});

describe('describeKioskConnection', () => {
  it('marks every non-connected state as degraded', () => {
    expect(describeKioskConnection('connected')).toMatchObject({
      label: 'Live',
      isDegraded: false,
    });
    expect(describeKioskConnection('reconnecting').isDegraded).toBe(true);
    expect(describeKioskConnection('stale').isDegraded).toBe(true);
    expect(describeKioskConnection('disconnected')).toMatchObject({
      label: 'Offline',
      isDegraded: true,
    });
  });
});

describe('getBlockAgeSeconds', () => {
  const nowMs = Date.parse('2026-01-01T00:01:00.000Z');

  it('measures the age of the newest block in whole seconds', () => {
    expect(getBlockAgeSeconds('2026-01-01T00:00:48.000Z', nowMs)).toBe(12);
  });

  it('reports clock skew as zero rather than a block from the future', () => {
    expect(getBlockAgeSeconds('2026-01-01T00:02:00.000Z', nowMs)).toBe(0);
  });

  it('is null without a usable timestamp', () => {
    expect(getBlockAgeSeconds(undefined, nowMs)).toBeNull();
    expect(getBlockAgeSeconds('not a date', nowMs)).toBeNull();
  });
});
