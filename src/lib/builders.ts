import type {
  BackendBuilderStats,
  BlobInclusionCandidateReason,
  BuilderRange,
} from '@/types';

/**
 * Pure helpers shared by the builder pages, the block detail view, and the
 * metadata builders. Everything here is server-safe: no "use client", no DOM.
 */

/** Link to a builder's page. Keys contain ':' and '-', so they are encoded. */
export function builderPagePath(key: string): string {
  return `/builder/${encodeURIComponent(key)}`;
}

export const DEFAULT_BUILDER_RANGE: BuilderRange = '24h';

export const BUILDER_RANGE_OPTIONS: ReadonlyArray<{ value: BuilderRange; label: string }> = [
  { value: '1h', label: '1h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

/** Sentence fragment naming a range, for copy like "over the last 24 hours". */
export const BUILDER_RANGE_DESCRIPTIONS: Record<BuilderRange, string> = {
  '1h': 'the last hour',
  '24h': 'the last 24 hours',
  '7d': 'the last 7 days',
  '30d': 'the last 30 days',
};

/** Whether a URL or storage value names a range the builder endpoints serve. */
export function isBuilderRange(value: string | null): value is BuilderRange {
  return value !== null && BUILDER_RANGE_OPTIONS.some((option) => option.value === value);
}

/**
 * Format a time to inclusion for display. Values are signed: negative means
 * our node first saw the transaction after the slot start of the block that
 * included it, so the builder had it before we did.
 */
export function formatTimeToInclusion(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '-';

  const sign = ms < 0 ? '-' : '';
  const magnitude = Math.abs(ms);

  if (magnitude < 1000) {
    return `${sign}${Math.round(magnitude)} ms`;
  }

  if (magnitude < 60_000) {
    return `${sign}${(magnitude / 1000).toFixed(1)}s`;
  }

  if (magnitude < 3_600_000) {
    // Rounded seconds can land on 60, which would read as "1m 60s".
    const totalSeconds = Math.round(magnitude / 1000);
    return `${sign}${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
  }

  const totalMinutes = Math.round(magnitude / 60_000);
  return `${sign}${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

/** Format an inclusion index, where 1 means the builder is neutral. */
export function formatInclusionIndex(index: number | null | undefined): string {
  if (index === null || index === undefined || !Number.isFinite(index)) return '-';
  return `${index.toFixed(2)}x`;
}

/**
 * Above this, a builder carries enough more of a sender's blobs than the
 * network does for the difference to be worth showing.
 */
export const INCLUSION_INDEX_FAVORED_THRESHOLD = 1.5;

/** Below this, the builder carries noticeably less of the sender's blobs. */
export const INCLUSION_INDEX_DISFAVORED_THRESHOLD = 0.67;

/**
 * How to color an inclusion index. The band around 1 is wide on purpose: small
 * samples swing the ratio, and this is a lead rather than a finding.
 */
export function inclusionIndexTone(
  index: number | null | undefined
): 'neutral' | 'favored' | 'disfavored' {
  if (index === null || index === undefined || !Number.isFinite(index)) return 'neutral';
  if (index > INCLUSION_INDEX_FAVORED_THRESHOLD) return 'favored';
  if (index < INCLUSION_INDEX_DISFAVORED_THRESHOLD) return 'disfavored';
  return 'neutral';
}

/** Short label and explanation for every candidate reason the backend sends. */
export const CANDIDATE_REASON_LABELS: Record<
  BlobInclusionCandidateReason,
  { label: string; description: string }
> = {
  eligible: {
    label: 'Eligible',
    description:
      'None of the other reasons applied, so the transaction was includable as far as our node could tell.',
  },
  too_recent: {
    label: 'Too recent',
    description:
      'First seen less than the candidate minimum age before the slot start, so the builder may not have had it yet.',
  },
  nonce_gap: {
    label: 'Nonce gap',
    description:
      'A lower-nonce blob transaction from the same sender was also pending, so this one could not be included on its own.',
  },
  priced_out_blob_fee: {
    label: 'Blob fee too low',
    description: "The max fee per blob gas was below the block's blob base fee.",
  },
  priced_out_exec_fee: {
    label: 'Exec fee too low',
    description: 'The max fee per gas was below the execution base fee.',
  },
  no_room: {
    label: 'No room',
    description: "The block's remaining blob capacity could not hold the transaction's blobs.",
  },
};

/** Whether a string names a candidate reason this build knows about. */
export function isCandidateReason(value: string): value is BlobInclusionCandidateReason {
  return Object.prototype.hasOwnProperty.call(CANDIDATE_REASON_LABELS, value);
}

export const ELIGIBLE_SKIPPED_TOOLTIP =
  'Eligible skipped counts pending blob transactions our own node could see and the ' +
  'builder did not include. Our mempool is not the builder’s, so this is never proof ' +
  'the builder saw a transaction and rejected it.';

export const BUILDER_COVERAGE_NOTE =
  'Builder attribution only exists for blocks indexed since the feature shipped, so ' +
  'totals for a range can read lower than the blob market for the same window until ' +
  'the backfill catches up.';

export const TIME_TO_INCLUSION_TOOLTIP =
  'Time to inclusion is measured from when our node first saw the transaction pending ' +
  'to the slot start of the block that included it. Only transactions seen pending ' +
  'first have a sample, and the value is negative when our node saw the transaction ' +
  'after the slot had already started.';

/** A builder's display name, falling back to its key when it has no name. */
export function builderDisplayName(
  builder: Pick<BackendBuilderStats, 'name' | 'key' | 'known'>
): string {
  return builder.name.trim() ? builder.name : builder.key;
}

/**
 * The change between two gwei amounts, e.g. a fee bump between a replaced
 * transaction and its replacement. Null when either side is missing or not a
 * number. Gwei fee values are small, so plain Number math is exact enough.
 */
export function formatSignedGweiDelta(fromGwei?: string, toGwei?: string): string | null {
  if (!fromGwei || !toGwei) return null;

  const from = Number(fromGwei);
  const to = Number(toGwei);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;

  const delta = to - from;
  // toFixed then trim, so 2.5 reads as "2.5" rather than "2.5000".
  const magnitude = Math.abs(delta)
    .toFixed(4)
    .replace(/\.?0+$/, '');

  // A zero change carries no direction, so it gets no sign.
  if (magnitude === '0') return '0 Gwei';

  return `${delta < 0 ? '-' : '+'}${magnitude} Gwei`;
}
