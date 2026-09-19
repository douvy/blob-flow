import {
  BUILDER_COVERAGE_NOTE,
  BUILDER_RANGE_DESCRIPTIONS,
  BUILDER_RANGE_OPTIONS,
  CANDIDATE_REASON_LABELS,
  DEFAULT_BUILDER_RANGE,
  ELIGIBLE_SKIPPED_TOOLTIP,
  INCLUSION_INDEX_DISFAVORED_THRESHOLD,
  INCLUSION_INDEX_FAVORED_THRESHOLD,
  TIME_TO_INCLUSION_TOOLTIP,
  builderDisplayName,
  builderPagePath,
  formatInclusionIndex,
  formatSignedGweiDelta,
  formatTimeToInclusion,
  inclusionIndexTone,
  isBuilderRange,
  isCandidateReason,
} from './builders';

describe('builderPagePath', () => {
  it('encodes the separators builder keys carry', () => {
    expect(builderPagePath('extra:titan builder')).toBe('/builder/extra%3Atitan%20builder');
    expect(builderPagePath('addr:0xabc')).toBe('/builder/addr%3A0xabc');
  });

  it('leaves a plain key readable', () => {
    expect(builderPagePath('beaverbuild')).toBe('/builder/beaverbuild');
  });
});

describe('builder ranges', () => {
  it('offers the four windows the backend serves, defaulting to 24h', () => {
    expect(BUILDER_RANGE_OPTIONS.map((option) => option.value)).toEqual([
      '1h',
      '24h',
      '7d',
      '30d',
    ]);
    expect(DEFAULT_BUILDER_RANGE).toBe('24h');
  });

  it('describes every option it offers', () => {
    for (const option of BUILDER_RANGE_OPTIONS) {
      expect(BUILDER_RANGE_DESCRIPTIONS[option.value]).toBeTruthy();
    }
    expect(BUILDER_RANGE_DESCRIPTIONS['24h']).toBe('the last 24 hours');
  });

  it('accepts only the served windows', () => {
    expect(isBuilderRange('7d')).toBe(true);
    expect(isBuilderRange('24h')).toBe(true);
    // The builder endpoints reject 'all' with a 400, unlike the chart ranges.
    expect(isBuilderRange('all')).toBe(false);
    expect(isBuilderRange('90d')).toBe(false);
    expect(isBuilderRange(null)).toBe(false);
  });
});

describe('formatTimeToInclusion', () => {
  it('renders nothing for a missing sample', () => {
    expect(formatTimeToInclusion(null)).toBe('-');
    expect(formatTimeToInclusion(undefined)).toBe('-');
    expect(formatTimeToInclusion(Number.NaN)).toBe('-');
    expect(formatTimeToInclusion(Number.POSITIVE_INFINITY)).toBe('-');
  });

  it('keeps sub-second waits in milliseconds', () => {
    expect(formatTimeToInclusion(0)).toBe('0 ms');
    expect(formatTimeToInclusion(850)).toBe('850 ms');
  });

  it('switches to seconds, minutes, then hours as the wait grows', () => {
    expect(formatTimeToInclusion(2400)).toBe('2.4s');
    expect(formatTimeToInclusion(59_900)).toBe('59.9s');
    expect(formatTimeToInclusion(90_000)).toBe('1m 30s');
    expect(formatTimeToInclusion(3_600_000)).toBe('1h 0m');
    expect(formatTimeToInclusion(5_400_000)).toBe('1h 30m');
    // Rounding must not produce a 60 in the smaller unit.
    expect(formatTimeToInclusion(119_999)).toBe('2m 0s');
  });

  it('keeps the sign on a negative wait, which means we saw the tx late', () => {
    expect(formatTimeToInclusion(-400)).toBe('-400 ms');
    expect(formatTimeToInclusion(-2400)).toBe('-2.4s');
    expect(formatTimeToInclusion(-90_000)).toBe('-1m 30s');
  });
});

describe('inclusion index', () => {
  it('formats an index as a multiple', () => {
    expect(formatInclusionIndex(1)).toBe('1.00x');
    expect(formatInclusionIndex(2.345)).toBe('2.35x');
    expect(formatInclusionIndex(null)).toBe('-');
    expect(formatInclusionIndex(undefined)).toBe('-');
  });

  it('treats a wide band around 1 as neutral', () => {
    expect(inclusionIndexTone(1)).toBe('neutral');
    expect(inclusionIndexTone(INCLUSION_INDEX_FAVORED_THRESHOLD)).toBe('neutral');
    expect(inclusionIndexTone(INCLUSION_INDEX_DISFAVORED_THRESHOLD)).toBe('neutral');
    expect(inclusionIndexTone(null)).toBe('neutral');
    expect(inclusionIndexTone(undefined)).toBe('neutral');
  });

  it('calls out the indexes outside that band', () => {
    expect(inclusionIndexTone(1.51)).toBe('favored');
    expect(inclusionIndexTone(4)).toBe('favored');
    expect(inclusionIndexTone(0.66)).toBe('disfavored');
    expect(inclusionIndexTone(0)).toBe('disfavored');
  });
});

describe('candidate reasons', () => {
  it('labels and explains every reason the backend sends', () => {
    const reasons = [
      'eligible',
      'too_recent',
      'nonce_gap',
      'priced_out_blob_fee',
      'priced_out_exec_fee',
      'no_room',
    ] as const;

    expect(Object.keys(CANDIDATE_REASON_LABELS).sort()).toEqual([...reasons].sort());

    for (const reason of reasons) {
      expect(CANDIDATE_REASON_LABELS[reason].label).toBeTruthy();
      expect(CANDIDATE_REASON_LABELS[reason].description).toContain(' ');
    }

    expect(CANDIDATE_REASON_LABELS.no_room.label).toBe('No room');
    expect(CANDIDATE_REASON_LABELS.priced_out_blob_fee.label).toBe('Blob fee too low');
  });

  it('recognizes only known reasons', () => {
    expect(isCandidateReason('nonce_gap')).toBe(true);
    expect(isCandidateReason('mystery')).toBe(false);
    // Nothing inherited from Object.prototype counts as a reason.
    expect(isCandidateReason('toString')).toBe(false);
  });
});

describe('builder copy', () => {
  it('says what eligible skipped does and does not prove', () => {
    expect(ELIGIBLE_SKIPPED_TOOLTIP).toContain('never proof');
    expect(ELIGIBLE_SKIPPED_TOOLTIP).toContain('our own node');
  });

  it('warns that coverage lags the blob market until the backfill lands', () => {
    expect(BUILDER_COVERAGE_NOTE).toContain('backfill');
    expect(BUILDER_COVERAGE_NOTE).toContain('lower');
  });

  it('explains what time to inclusion measures and why it can be negative', () => {
    expect(TIME_TO_INCLUSION_TOOLTIP).toContain('slot start');
    expect(TIME_TO_INCLUSION_TOOLTIP).toContain('negative');
  });
});

describe('builderDisplayName', () => {
  it('prefers the name', () => {
    expect(builderDisplayName({ key: 'beaverbuild', name: 'beaverbuild', known: true })).toBe(
      'beaverbuild'
    );
  });

  it('falls back to the key for a builder with no name', () => {
    expect(builderDisplayName({ key: 'addr:0xabc', name: '', known: false })).toBe('addr:0xabc');
    expect(builderDisplayName({ key: 'addr:0xabc', name: '   ', known: false })).toBe('addr:0xabc');
  });
});

describe('formatSignedGweiDelta', () => {
  it('signs the change between two gwei amounts', () => {
    expect(formatSignedGweiDelta('1', '3')).toBe('+2 Gwei');
    expect(formatSignedGweiDelta('1', '0.5')).toBe('-0.5 Gwei');
    expect(formatSignedGweiDelta('0.25', '0.3125')).toBe('+0.0625 Gwei');
  });

  it('drops the sign when nothing changed', () => {
    expect(formatSignedGweiDelta('1.5', '1.5')).toBe('0 Gwei');
  });

  it('rounds to at most four fraction digits', () => {
    expect(formatSignedGweiDelta('0', '0.123456')).toBe('+0.1235 Gwei');
  });

  it('has nothing to report when either side is missing or unparseable', () => {
    expect(formatSignedGweiDelta(undefined, '1')).toBeNull();
    expect(formatSignedGweiDelta('1', undefined)).toBeNull();
    expect(formatSignedGweiDelta('', '1')).toBeNull();
    expect(formatSignedGweiDelta('not-a-number', '1')).toBeNull();
    expect(formatSignedGweiDelta('1', 'not-a-number')).toBeNull();
  });
});
