import type { BlobResponse } from '@/types';
import {
  BLOB_CAPACITY_BYTES,
  EFFICIENCY_RUBRIC,
  UNATTRIBUTED_ENTITY,
  computeEfficiencyReport,
  gradeLetter,
  medianOf,
  scoreFill,
  scoreHeadroom,
  scoreTip,
  tipRatio,
} from './efficiency';

let nextBlobId = 0;

function makeBlob(overrides: Partial<BlobResponse> = {}): BlobResponse {
  nextBlobId++;
  return {
    network_id: 1,
    network_name: 'mainnet',
    block_number: 100000,
    blob_index: 0,
    tx_hash: `0xtx${nextBlobId}`,
    from_address: '0xabc',
    blob_size_bytes: BLOB_CAPACITY_BYTES,
    base_fee_per_blob_gas: '3349640',
    tip_per_blob_gas: '1000000000',
    total_cost_eth: '0.0001',
    timestamp: '2026-08-01T12:00:00.000Z',
    confirmed: true,
    user_attribution: 'OP Mainnet',
    fee_cap_headroom_percent: '99.665036',
    ...overrides,
  };
}

beforeEach(() => {
  nextBlobId = 0;
});

describe('medianOf', () => {
  it('returns 0 for an empty list', () => {
    expect(medianOf([])).toBe(0);
  });

  it('returns the middle value for odd counts', () => {
    expect(medianOf([5, 1, 3])).toBe(3);
  });

  it('averages the two middle values for even counts', () => {
    expect(medianOf([4, 1, 2, 3])).toBe(2.5);
  });
});

describe('scoreFill', () => {
  it('awards full weight at 100% fill', () => {
    expect(scoreFill(100)).toBe(EFFICIENCY_RUBRIC.fill.weight);
  });

  it('is linear in the fill percent', () => {
    expect(scoreFill(50)).toBe(EFFICIENCY_RUBRIC.fill.weight / 2);
  });

  it('clamps out-of-range values', () => {
    expect(scoreFill(-10)).toBe(0);
    expect(scoreFill(140)).toBe(EFFICIENCY_RUBRIC.fill.weight);
  });
});

describe('scoreTip', () => {
  it('awards full weight at or below the median', () => {
    expect(scoreTip(1)).toBe(EFFICIENCY_RUBRIC.tip.weight);
    expect(scoreTip(0.2)).toBe(EFFICIENCY_RUBRIC.tip.weight);
  });

  it('awards nothing at or beyond the zero ratio', () => {
    expect(scoreTip(EFFICIENCY_RUBRIC.tip.zeroRatio)).toBe(0);
    expect(scoreTip(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('interpolates linearly between the thresholds', () => {
    const midpoint =
      (EFFICIENCY_RUBRIC.tip.fullRatio + EFFICIENCY_RUBRIC.tip.zeroRatio) / 2;
    expect(scoreTip(midpoint)).toBeCloseTo(EFFICIENCY_RUBRIC.tip.weight / 2);
  });
});

describe('scoreHeadroom', () => {
  it('awards full weight at or below the full threshold', () => {
    expect(scoreHeadroom(EFFICIENCY_RUBRIC.headroom.fullPercent)).toBe(
      EFFICIENCY_RUBRIC.headroom.weight
    );
    expect(scoreHeadroom(0)).toBe(EFFICIENCY_RUBRIC.headroom.weight);
  });

  it('awards nothing at or beyond the zero threshold', () => {
    expect(scoreHeadroom(EFFICIENCY_RUBRIC.headroom.zeroPercent)).toBe(0);
    expect(scoreHeadroom(100)).toBe(0);
  });

  it('interpolates linearly between the thresholds', () => {
    const midpoint =
      (EFFICIENCY_RUBRIC.headroom.fullPercent +
        EFFICIENCY_RUBRIC.headroom.zeroPercent) /
      2;
    expect(scoreHeadroom(midpoint)).toBeCloseTo(
      EFFICIENCY_RUBRIC.headroom.weight / 2
    );
  });

  it('awards the neutral midpoint when no headroom data exists', () => {
    expect(scoreHeadroom(null)).toBe(EFFICIENCY_RUBRIC.headroom.weight / 2);
  });
});

describe('tipRatio', () => {
  it('divides by the median when it is positive', () => {
    expect(tipRatio(200, 100)).toBe(2);
  });

  it('is neutral when both the entity and the median pay nothing', () => {
    expect(tipRatio(0, 0)).toBe(1);
  });

  it('is infinite when the entity tips against a zero median', () => {
    expect(tipRatio(5, 0)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('gradeLetter', () => {
  it('maps band boundaries to their letters', () => {
    expect(gradeLetter(100)).toBe('A+');
    expect(gradeLetter(97)).toBe('A+');
    expect(gradeLetter(96.9)).toBe('A');
    expect(gradeLetter(90)).toBe('A-');
    expect(gradeLetter(87)).toBe('B+');
    expect(gradeLetter(83)).toBe('B');
    expect(gradeLetter(80)).toBe('B-');
    expect(gradeLetter(77)).toBe('C+');
    expect(gradeLetter(73)).toBe('C');
    expect(gradeLetter(70)).toBe('C-');
    expect(gradeLetter(67)).toBe('D+');
    expect(gradeLetter(63)).toBe('D');
    expect(gradeLetter(60)).toBe('D-');
    expect(gradeLetter(59.9)).toBe('F');
    expect(gradeLetter(0)).toBe('F');
  });
});

describe('computeEfficiencyReport', () => {
  it('returns an empty report for zero blobs', () => {
    const report = computeEfficiencyReport([]);
    expect(report.sampleSize).toBe(0);
    expect(report.medianTipWei).toBe(0);
    expect(report.cards).toEqual([]);
  });

  it('groups unattributed senders under Unknown', () => {
    const report = computeEfficiencyReport([
      makeBlob({ user_attribution: undefined }),
      makeBlob({ user_attribution: '' }),
      makeBlob({ user_attribution: '  ' }),
      makeBlob({ user_attribution: 'Base' }),
    ]);
    const entities = report.cards.map((card) => card.entity).sort();
    expect(entities).toEqual(['Base', UNATTRIBUTED_ENTITY]);
    const unknown = report.cards.find(
      (card) => card.entity === UNATTRIBUTED_ENTITY
    );
    expect(unknown?.blobCount).toBe(3);
  });

  it('averages blob fill against the 131072-byte capacity', () => {
    const report = computeEfficiencyReport([
      makeBlob({ user_attribution: 'Base', blob_size_bytes: BLOB_CAPACITY_BYTES }),
      makeBlob({ user_attribution: 'Base', blob_size_bytes: BLOB_CAPACITY_BYTES / 2 }),
    ]);
    expect(report.cards[0].avgFillPercent).toBeCloseTo(75);
  });

  it('clamps oversized and treats invalid sizes as empty', () => {
    const report = computeEfficiencyReport([
      makeBlob({ user_attribution: 'Base', blob_size_bytes: BLOB_CAPACITY_BYTES * 3 }),
      makeBlob({ user_attribution: 'Base', blob_size_bytes: -50 }),
      makeBlob({
        user_attribution: 'Base',
        blob_size_bytes: undefined as unknown as number,
      }),
    ]);
    // One clamped-full blob and two empty ones.
    expect(report.cards[0].avgFillPercent).toBeCloseTo(100 / 3);
  });

  it('computes the sample-wide median tip and per-entity ratios', () => {
    const report = computeEfficiencyReport([
      makeBlob({ user_attribution: 'Cheap', tip_per_blob_gas: '100' }),
      makeBlob({ user_attribution: 'Median', tip_per_blob_gas: '200' }),
      makeBlob({ user_attribution: 'Pricey', tip_per_blob_gas: '800' }),
    ]);
    expect(report.medianTipWei).toBe(200);
    const byEntity = new Map(report.cards.map((card) => [card.entity, card]));
    expect(byEntity.get('Cheap')?.tipToMedianRatio).toBeCloseTo(0.5);
    expect(byEntity.get('Median')?.tipToMedianRatio).toBeCloseTo(1);
    expect(byEntity.get('Pricey')?.tipToMedianRatio).toBeCloseTo(4);
    expect(byEntity.get('Pricey')?.grade.tipPoints).toBe(0);
  });

  it('treats unparseable tips as zero', () => {
    const report = computeEfficiencyReport([
      makeBlob({ user_attribution: 'Base', tip_per_blob_gas: 'not-a-number' }),
      makeBlob({ user_attribution: 'Base', tip_per_blob_gas: '100' }),
    ]);
    expect(report.cards[0].avgTipWei).toBe(50);
  });

  it('averages headroom over only the blobs that carry it', () => {
    const report = computeEfficiencyReport([
      makeBlob({ user_attribution: 'Base', fee_cap_headroom_percent: '40' }),
      makeBlob({ user_attribution: 'Base', fee_cap_headroom_percent: '80' }),
      makeBlob({ user_attribution: 'Base', fee_cap_headroom_percent: undefined }),
    ]);
    const card = report.cards[0];
    expect(card.avgHeadroomPercent).toBeCloseTo(60);
    expect(card.headroomSampleCount).toBe(2);
    expect(card.blobCount).toBe(3);
  });

  it('marks headroom as unavailable when no blob carries it', () => {
    const report = computeEfficiencyReport([
      makeBlob({ user_attribution: 'Base', fee_cap_headroom_percent: undefined }),
      makeBlob({ user_attribution: 'Base', fee_cap_headroom_percent: '' }),
    ]);
    const card = report.cards[0];
    expect(card.avgHeadroomPercent).toBeNull();
    expect(card.headroomSampleCount).toBe(0);
    expect(card.grade.headroomPoints).toBe(
      EFFICIENCY_RUBRIC.headroom.weight / 2
    );
  });

  it('composes the score from the three point buckets', () => {
    const report = computeEfficiencyReport([
      makeBlob({
        user_attribution: 'Solo',
        blob_size_bytes: BLOB_CAPACITY_BYTES,
        tip_per_blob_gas: '100',
        fee_cap_headroom_percent: '25',
      }),
    ]);
    const card = report.cards[0];
    // A lone entity defines the median, so its ratio is exactly 1.
    expect(card.grade.fillPoints).toBe(EFFICIENCY_RUBRIC.fill.weight);
    expect(card.grade.tipPoints).toBe(EFFICIENCY_RUBRIC.tip.weight);
    expect(card.grade.headroomPoints).toBe(EFFICIENCY_RUBRIC.headroom.weight);
    expect(card.grade.score).toBe(100);
    expect(card.grade.letter).toBe('A+');
  });

  it('sorts cards best score first with stable tie-breaks', () => {
    const full = { blob_size_bytes: BLOB_CAPACITY_BYTES };
    const half = { blob_size_bytes: BLOB_CAPACITY_BYTES / 2 };
    const report = computeEfficiencyReport([
      makeBlob({ user_attribution: 'Slacker', ...half }),
      makeBlob({ user_attribution: 'Busy', ...full }),
      makeBlob({ user_attribution: 'Busy', ...full }),
      makeBlob({ user_attribution: 'Alpha', ...full }),
      makeBlob({ user_attribution: 'Beta', ...full }),
    ]);
    expect(report.cards.map((card) => card.entity)).toEqual([
      'Busy',
      'Alpha',
      'Beta',
      'Slacker',
    ]);
  });
});
