import { describe, expect, it } from 'vitest';
import {
  buildCardHref,
  buildCardImagePath,
  cardDataNeeds,
  cardEntityOptions,
  cardHeadline,
  deriveCardStats,
  DEFAULT_CARD_NETWORK,
  DEFAULT_CARD_RANGE,
  NETWORK_WIDE_ENTITY,
  NETWORK_WIDE_NAME,
  normalizeCardParams,
  parseCardParams,
  resolveCard,
  resolveCardEntity,
  sanitizeEntityName,
  slugifyEntity,
  titleCaseSlug,
  type CardParams,
} from './statCard';
import type {
  BackendAttributionUsageChartResponse,
  BackendAttributionUsageShare,
  BackendCostComparisonChartResponse,
} from '@/types';

function share(overrides: Partial<BackendAttributionUsageShare> = {}): BackendAttributionUsageShare {
  return {
    key: 'base',
    name: 'Base',
    category: 'rollup',
    blob_count: 400,
    total_cost_wei: '2000000000000000000',
    blob_share_percent: 40,
    spend_share_percent: 25,
    ...overrides,
  };
}

function attribution(
  shares: BackendAttributionUsageShare[] = [share()]
): BackendAttributionUsageChartResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    range: '7d',
    granularity: 'hour',
    bucket_seconds: 3600,
    start_time: '2026-07-26T00:00:00Z',
    end_time: '2026-08-02T00:00:00Z',
    generated_at: '2026-08-02T00:00:00Z',
    series: [],
    points: [],
    summary: {
      total_blobs: 1000,
      total_cost_wei: '8000000000000000000',
      shares,
    },
  };
}

function costComparison(savingsPercent: number): BackendCostComparisonChartResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    range: '7d',
    granularity: 'hour',
    bucket_seconds: 3600,
    start_time: '2026-07-26T00:00:00Z',
    end_time: '2026-08-02T00:00:00Z',
    generated_at: '2026-08-02T00:00:00Z',
    model: { calldata_gas_per_byte: 16, blob_size_bytes: 131072, description: 'model' },
    points: [],
    summary: {
      blob_cost_wei: '1000',
      calldata_equivalent_cost_wei: '100000',
      savings_wei: '99000',
      savings_percent: savingsPercent,
    },
  };
}

describe('slugifyEntity', () => {
  it('reduces names to a url-safe slug', () => {
    expect(slugifyEntity('OP Mainnet')).toBe('op-mainnet');
    expect(slugifyEntity('  zkSync Era  ')).toBe('zksync-era');
  });

  it('strips characters that could escape a query string or markup', () => {
    expect(slugifyEntity('<script>alert(1)</script>')).toBe('script-alert-1-script');
    expect(slugifyEntity('base&range=all')).toBe('base-range-all');
  });

  it('returns an empty slug when nothing usable is left', () => {
    expect(slugifyEntity('***')).toBe('');
    expect(slugifyEntity('')).toBe('');
  });

  it('caps the slug length', () => {
    expect(slugifyEntity('a'.repeat(80))).toHaveLength(40);
  });
});

describe('parseCardParams', () => {
  it('reads a complete query string', () => {
    const params = parseCardParams(
      new URLSearchParams('entity=base&range=7d&metrics=blob-share,eth-spent')
    );

    expect(params).toEqual({
      entity: 'base',
      range: '7d',
      metrics: ['blob-share', 'eth-spent'],
      network: DEFAULT_CARD_NETWORK,
    });
  });

  it('accepts Next.js searchParams objects, taking the first repeated value', () => {
    const params = parseCardParams({
      entity: ['base', 'linea'],
      range: '24h',
      metrics: 'spend-share',
    });

    expect(params.entity).toBe('base');
    expect(params.range).toBe('24h');
    expect(params.metrics).toEqual(['spend-share']);
  });

  it('falls back to the market-wide card for an unusable entity', () => {
    expect(parseCardParams(new URLSearchParams('entity=%20%20')).entity).toBe(NETWORK_WIDE_ENTITY);
    expect(parseCardParams({}).entity).toBe(NETWORK_WIDE_ENTITY);
  });

  it('falls back to the default range for an unknown range', () => {
    expect(parseCardParams(new URLSearchParams('range=90d')).range).toBe(DEFAULT_CARD_RANGE);
    expect(parseCardParams(new URLSearchParams('range=ALL')).range).toBe('all');
  });

  it('drops unknown metrics and keeps the author order', () => {
    const params = parseCardParams(
      new URLSearchParams('entity=base&metrics=eth-spent,made-up,blob-share')
    );

    expect(params.metrics).toEqual(['eth-spent', 'blob-share']);
  });

  it('caps the metric list at three', () => {
    const params = parseCardParams(
      new URLSearchParams(
        'entity=base&metrics=blob-share,spend-share,blob-count,eth-spent,base-fee'
      )
    );

    expect(params.metrics).toEqual(['blob-share', 'spend-share', 'blob-count']);
  });

  it('removes duplicate metrics', () => {
    const params = parseCardParams(new URLSearchParams('entity=base&metrics=eth-spent,eth-spent'));

    expect(params.metrics).toEqual(['eth-spent']);
  });

  it('drops share metrics from a market-wide card and falls back when nothing is left', () => {
    const params = parseCardParams(new URLSearchParams('metrics=blob-share,spend-share'));

    expect(params.metrics).toEqual(['blob-count', 'eth-spent']);
  });

  it('drops the calldata comparison from an entity card', () => {
    const params = parseCardParams(
      new URLSearchParams('entity=base&metrics=savings-vs-calldata,blob-count')
    );

    expect(params.metrics).toEqual(['blob-count']);
  });

  it('keeps a network identifier and rejects anything not shaped like one', () => {
    expect(parseCardParams(new URLSearchParams('network=sepolia')).network).toBe('sepolia');
    expect(parseCardParams(new URLSearchParams('network=main%26limit%3D9')).network).toBe(
      DEFAULT_CARD_NETWORK
    );
    expect(parseCardParams(new URLSearchParams('network=')).network).toBe(DEFAULT_CARD_NETWORK);
  });

  it('keeps a network the indexer serves dynamically rather than reading it as mainnet', () => {
    // Callers check the network against the served list first (the page via
    // its [network] layout, the image route via resolveCardNetwork), so
    // clamping here to the bootstrap constants would put mainnet's numbers
    // under another network's name.
    expect(parseCardParams(new URLSearchParams(), 'holesky').network).toBe('holesky');
    expect(parseCardParams(new URLSearchParams('network=holesky')).network).toBe('holesky');
  });

  it('takes the network from the page segment over the query', () => {
    const params = parseCardParams(new URLSearchParams('network=mainnet'), 'sepolia');

    expect(params.network).toBe('sepolia');
  });
});

describe('link building', () => {
  const params: CardParams = {
    entity: 'base',
    range: '30d',
    metrics: ['blob-share', 'eth-spent'],
    network: DEFAULT_CARD_NETWORK,
  };

  it('round-trips through parseCardParams', () => {
    const href = buildCardHref(params);
    const parsed = parseCardParams(new URLSearchParams(href.split('?')[1]));

    expect(parsed).toEqual(params);
  });

  it('names the network in the path, the way every page does', () => {
    expect(buildCardHref(params)).toBe('/card?entity=base&range=30d&metrics=blob-share%2Ceth-spent');
    expect(buildCardHref({ ...params, network: 'sepolia' })).toBe(
      '/sepolia/card?entity=base&range=30d&metrics=blob-share%2Ceth-spent'
    );
  });

  it('points the image route at the same card', () => {
    expect(buildCardImagePath(params)).toBe(
      '/api/og/card?entity=base&range=30d&metrics=blob-share%2Ceth-spent&network=mainnet'
    );
    expect(buildCardImagePath({ ...params, network: 'sepolia' })).toContain('&network=sepolia');
  });
});

describe('normalizeCardParams', () => {
  it('drops metrics the new card cannot show', () => {
    const normalized = normalizeCardParams({
      entity: NETWORK_WIDE_ENTITY,
      range: '7d',
      metrics: ['blob-share', 'blob-count'],
      network: DEFAULT_CARD_NETWORK,
    });

    expect(normalized.metrics).toEqual(['blob-count']);
  });

  it('leaves a valid selection alone', () => {
    const params: CardParams = {
      entity: 'base',
      range: '1h',
      metrics: ['blob-share', 'avg-cost-per-blob'],
      network: 'sepolia',
    };

    expect(normalizeCardParams(params)).toEqual(params);
  });
});

describe('sanitizeEntityName', () => {
  it('collapses whitespace and strips control characters', () => {
    expect(sanitizeEntityName('  Base \u0000 L2\n')).toBe('Base L2');
  });

  it('truncates very long names', () => {
    expect(sanitizeEntityName('N'.repeat(60))).toBe(`${'N'.repeat(27)}…`);
  });

  it('falls back when nothing readable is left', () => {
    expect(sanitizeEntityName('   ')).toBe('Unknown sender');
  });
});

describe('titleCaseSlug', () => {
  it('makes a slug presentable', () => {
    expect(titleCaseSlug('op-mainnet')).toBe('Op Mainnet');
    expect(titleCaseSlug('base')).toBe('Base');
  });
});

describe('cardEntityOptions', () => {
  it('orders entities by blob share and attaches bundled logos', () => {
    const options = cardEntityOptions(
      attribution([
        share({ key: 'linea', name: 'Linea', blob_share_percent: 10 }),
        share({ key: 'base', name: 'Base', blob_share_percent: 40 }),
      ])
    );

    expect(options.map((option) => option.slug)).toEqual(['base', 'linea']);
    expect(options[0].iconSrc).toBe('/images/entities/base.png');
  });

  it('drops duplicate slugs and returns nothing without data', () => {
    const options = cardEntityOptions(
      attribution([share({ key: 'base', name: 'Base' }), share({ key: '0xbase', name: 'base' })])
    );

    expect(options).toHaveLength(1);
    expect(cardEntityOptions(null)).toEqual([]);
  });
});

describe('resolveCardEntity', () => {
  it('resolves a known entity', () => {
    const entity = resolveCardEntity(attribution(), 'base');

    expect(entity).toEqual({
      slug: 'base',
      name: 'Base',
      iconSrc: '/images/entities/base.png',
      isNetworkWide: false,
    });
  });

  it('prefers the display name over an address key', () => {
    const entity = resolveCardEntity(
      attribution([share({ key: '0xabcd', name: 'OP Mainnet' })]),
      'op-mainnet'
    );

    expect(entity.name).toBe('OP Mainnet');
    expect(cardEntityOptions(attribution([share({ key: '0xabcd', name: 'OP Mainnet' })]))[0].slug)
      .toBe('op-mainnet');
  });

  it('still resolves a link that carries the backend key', () => {
    const entity = resolveCardEntity(
      attribution([share({ key: '0xabcd', name: 'OP Mainnet' })]),
      '0xabcd'
    );

    expect(entity.name).toBe('OP Mainnet');
  });

  it('degrades to the market-wide card for an entity the data does not know', () => {
    expect(resolveCardEntity(attribution(), 'not-a-rollup')).toEqual({
      slug: NETWORK_WIDE_ENTITY,
      name: NETWORK_WIDE_NAME,
      iconSrc: null,
      isNetworkWide: true,
    });
  });

  it('stands in with the slug while data is loading', () => {
    expect(resolveCardEntity(null, 'op-mainnet')).toEqual({
      slug: 'op-mainnet',
      name: 'Op Mainnet',
      iconSrc: null,
      isNetworkWide: false,
    });
  });
});

describe('deriveCardStats', () => {
  const entityParams: CardParams = {
    entity: 'base',
    range: '7d',
    metrics: ['blob-share', 'spend-share', 'eth-spent'],
    network: DEFAULT_CARD_NETWORK,
  };

  it('derives entity metrics from that entity share', () => {
    const stats = deriveCardStats(entityParams, { attribution: attribution() });

    expect(stats).toEqual([
      { id: 'blob-share', label: 'Blob share', value: '40%' },
      { id: 'spend-share', label: 'Spend share', value: '25%' },
      { id: 'eth-spent', label: 'ETH spent', value: '2 ETH' },
    ]);
  });

  it('derives market-wide metrics from the summary totals', () => {
    const stats = deriveCardStats(
      { ...entityParams, entity: NETWORK_WIDE_ENTITY, metrics: ['blob-count', 'eth-spent'] },
      { attribution: attribution() }
    );

    expect(stats.map((stat) => stat.value)).toEqual(['1,000', '8 ETH']);
  });

  it('divides spend by blob count for the average', () => {
    const stats = deriveCardStats(
      { ...entityParams, metrics: ['avg-cost-per-blob'] },
      { attribution: attribution([share({ blob_count: 4, total_cost_wei: '4000000000' })]) }
    );

    expect(stats[0].value).toBe('1 Gwei');
  });

  it('returns a placeholder rather than dividing by zero blobs', () => {
    const stats = deriveCardStats(
      { ...entityParams, metrics: ['avg-cost-per-blob'] },
      { attribution: attribution([share({ blob_count: 0, total_cost_wei: '4000000000' })]) }
    );

    expect(stats[0].value).toBe('-');
  });

  it('reads savings and base fee from their own endpoints', () => {
    const stats = deriveCardStats(
      {
        ...entityParams,
        entity: NETWORK_WIDE_ENTITY,
        metrics: ['savings-vs-calldata', 'base-fee'],
      },
      { attribution: attribution(), costComparison: costComparison(98.6), baseFeeGwei: '0.0125' }
    );

    expect(stats.map((stat) => stat.value)).toEqual(['98.6%', '0.0125 Gwei']);
  });

  it('keeps every requested row when the data is missing', () => {
    const stats = deriveCardStats(entityParams, {});

    expect(stats.map((stat) => stat.id)).toEqual(['blob-share', 'spend-share', 'eth-spent']);
    expect(stats.every((stat) => stat.value === '-')).toBe(true);
  });

  it('does not throw on malformed wei values', () => {
    const stats = deriveCardStats(
      { ...entityParams, metrics: ['eth-spent', 'avg-cost-per-blob'] },
      { attribution: attribution([share({ total_cost_wei: 'not-a-number' })]) }
    );

    expect(stats.map((stat) => stat.value)).toEqual(['-', '-']);
  });
});

describe('resolveCard', () => {
  it('renders the card the link asked for', () => {
    const { entity, stats } = resolveCard(
      {
        entity: 'base',
        range: '7d',
        metrics: ['blob-share', 'eth-spent'],
        network: DEFAULT_CARD_NETWORK,
      },
      { attribution: attribution() }
    );

    expect(entity.name).toBe('Base');
    expect(stats.map((stat) => stat.id)).toEqual(['blob-share', 'eth-spent']);
  });

  it('swaps share metrics for market-wide ones when the entity is gone', () => {
    const { entity, stats } = resolveCard(
      {
        entity: 'retired-rollup',
        range: '7d',
        metrics: ['blob-share', 'spend-share'],
        network: DEFAULT_CARD_NETWORK,
      },
      { attribution: attribution() }
    );

    expect(entity.isNetworkWide).toBe(true);
    expect(stats.map((stat) => stat.id)).toEqual(['blob-count', 'eth-spent']);
    expect(stats.every((stat) => stat.value !== '-')).toBe(true);
  });
});

describe('cardDataNeeds', () => {
  it('only asks for the endpoints the chosen metrics use', () => {
    expect(cardDataNeeds(['blob-share', 'eth-spent'])).toEqual({
      costComparison: false,
      pricing: false,
    });
    expect(cardDataNeeds(['savings-vs-calldata', 'base-fee'])).toEqual({
      costComparison: true,
      pricing: true,
    });
  });
});

describe('cardHeadline', () => {
  it('names the entity and the range', () => {
    const headline = cardHeadline(
      { entity: 'base', range: '7d', metrics: ['blob-share'], network: DEFAULT_CARD_NETWORK },
      'Base'
    );

    expect(headline).toBe('Base blob stats · Last 7 days');
  });
});
