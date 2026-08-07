/**
 * Blobspace efficiency report cards: pure aggregation and grading logic.
 *
 * Grades how well each rollup uses blobspace over a recent sample of the
 * blob feed. The angle is competence, not volume: shipping half-empty blobs
 * and overpaying for inclusion lose points; filling blobs and bidding close
 * to the going rate earn them.
 */
import type { BlobResponse } from '@/types';

/** EIP-4844 blob capacity in bytes; blob_size_bytes is measured against it. */
export const BLOB_CAPACITY_BYTES = 131072;

/** Bucket for blobs whose sender the attribution registry does not know. */
export const UNATTRIBUTED_ENTITY = 'Unknown';

/**
 * Grading rubric, rendered verbatim on the page so grades are defensible.
 *
 * - fill: average share of the 131,072-byte capacity actually used. Worth
 *   the most because empty blobspace is pure waste: the network commits to
 *   a full blob regardless of how much data it carries.
 * - tip: average tip per blob gas relative to the sample median. The median
 *   is what inclusion actually costs right now; full marks at or below it,
 *   zero once a rollup pays zeroRatio times the median.
 * - headroom: average fee_cap_headroom_percent, the share of the fee cap
 *   left unused by the base fee (0 to 100). Persistently high headroom means
 *   bidding a cap far above the going rate. Full marks at or below
 *   fullPercent, zero at zeroPercent and above.
 */
export const EFFICIENCY_RUBRIC = {
  fill: { weight: 50 },
  tip: { weight: 30, fullRatio: 1, zeroRatio: 4 },
  headroom: { weight: 20, fullPercent: 50, zeroPercent: 100 },
} as const;

/** Score thresholds for letter grades, checked top to bottom. */
export const GRADE_SCALE = [
  { min: 97, letter: 'A+' },
  { min: 93, letter: 'A' },
  { min: 90, letter: 'A-' },
  { min: 87, letter: 'B+' },
  { min: 83, letter: 'B' },
  { min: 80, letter: 'B-' },
  { min: 77, letter: 'C+' },
  { min: 73, letter: 'C' },
  { min: 70, letter: 'C-' },
  { min: 67, letter: 'D+' },
  { min: 63, letter: 'D' },
  { min: 60, letter: 'D-' },
  { min: 0, letter: 'F' },
] as const;

export type LetterGrade = (typeof GRADE_SCALE)[number]['letter'];

export interface EntityEfficiencyMetrics {
  entity: string;
  blobCount: number;
  /** Mean blob_size_bytes / capacity, as a 0..100 percent. */
  avgFillPercent: number;
  /** Mean tip_per_blob_gas in wei. */
  avgTipWei: number;
  /**
   * avgTipWei relative to the sample-wide median tip. 1 means the entity
   * pays exactly the going rate. Infinity when the median is zero but the
   * entity still tips (paying anything when peers pay nothing).
   */
  tipToMedianRatio: number;
  /**
   * Mean fee_cap_headroom_percent over the blobs that carry the field, or
   * null when none do (older indexer rows omit it).
   */
  avgHeadroomPercent: number | null;
  /** How many of the entity's blobs carried fee_cap_headroom_percent. */
  headroomSampleCount: number;
}

export interface GradeBreakdown {
  fillPoints: number;
  tipPoints: number;
  headroomPoints: number;
  /** Sum of the three point buckets, 0..100. */
  score: number;
  letter: LetterGrade;
}

export interface EntityReportCard extends EntityEfficiencyMetrics {
  grade: GradeBreakdown;
}

export interface EfficiencyReport {
  /** Number of blobs actually aggregated (the feed may return fewer than asked). */
  sampleSize: number;
  /** Sample-wide median tip per blob gas in wei; the tip metric's baseline. */
  medianTipWei: number;
  /** One card per entity, best score first. */
  cards: EntityReportCard[];
}

/** Wei string to number; unparseable or negative values count as zero. */
function parseWeiNumber(value: string | undefined): number {
  if (value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** Percent string to number, or null when absent or unparseable. */
function parsePercent(value: string | undefined): number | null {
  if (value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Blob fill as a 0..100 percent, clamped so bad rows cannot leave range. */
function fillPercent(blobSizeBytes: number | undefined): number {
  if (typeof blobSizeBytes !== 'number' || !Number.isFinite(blobSizeBytes)) {
    return 0;
  }
  const clamped = Math.min(Math.max(blobSizeBytes, 0), BLOB_CAPACITY_BYTES);
  return (clamped / BLOB_CAPACITY_BYTES) * 100;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Standard median: middle value, or mean of the two middle values. */
export function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Linear score for a lower-is-better metric: full weight at or below fullAt,
 * zero at or above zeroAt.
 */
function linearScore(
  value: number,
  fullAt: number,
  zeroAt: number,
  weight: number
): number {
  if (value <= fullAt) return weight;
  if (value >= zeroAt) return 0;
  return weight * ((zeroAt - value) / (zeroAt - fullAt));
}

/** Points earned for average blob fill; linear in the fill percent. */
export function scoreFill(avgFillPercent: number): number {
  const clamped = Math.min(Math.max(avgFillPercent, 0), 100);
  return (clamped / 100) * EFFICIENCY_RUBRIC.fill.weight;
}

/** Points earned for tip discipline relative to the sample median. */
export function scoreTip(tipToMedianRatio: number): number {
  const { weight, fullRatio, zeroRatio } = EFFICIENCY_RUBRIC.tip;
  return linearScore(tipToMedianRatio, fullRatio, zeroRatio, weight);
}

/**
 * Points earned for fee cap discipline. Entities whose blobs carry no
 * headroom data score the neutral midpoint: there is nothing to grade, and
 * neither rewarding nor dunking on missing data would be defensible.
 */
export function scoreHeadroom(avgHeadroomPercent: number | null): number {
  const { weight, fullPercent, zeroPercent } = EFFICIENCY_RUBRIC.headroom;
  if (avgHeadroomPercent === null) return weight / 2;
  return linearScore(avgHeadroomPercent, fullPercent, zeroPercent, weight);
}

/** Letter for a 0..100 score. */
export function gradeLetter(score: number): LetterGrade {
  const band = GRADE_SCALE.find((entry) => score >= entry.min);
  return band ? band.letter : 'F';
}

/**
 * Tip-to-median ratio for one entity. A zero median means peers pay nothing,
 * so any tip at all is treated as infinitely above the going rate; two zeros
 * are exactly at it.
 */
export function tipRatio(avgTipWei: number, medianTipWei: number): number {
  if (medianTipWei > 0) return avgTipWei / medianTipWei;
  return avgTipWei > 0 ? Number.POSITIVE_INFINITY : 1;
}

function gradeMetrics(metrics: EntityEfficiencyMetrics): GradeBreakdown {
  const fillPoints = scoreFill(metrics.avgFillPercent);
  const tipPoints = scoreTip(metrics.tipToMedianRatio);
  const headroomPoints = scoreHeadroom(metrics.avgHeadroomPercent);
  const score = fillPoints + tipPoints + headroomPoints;
  return {
    fillPoints,
    tipPoints,
    headroomPoints,
    score,
    letter: gradeLetter(score),
  };
}

/**
 * Aggregate a recent blob sample into per-entity report cards. Blobs without
 * a user_attribution are grouped under UNATTRIBUTED_ENTITY. Cards are sorted
 * best score first, ties broken by blob count then name so the order is
 * stable across refreshes.
 */
export function computeEfficiencyReport(
  blobs: BlobResponse[]
): EfficiencyReport {
  const medianTipWei = medianOf(
    blobs.map((blob) => parseWeiNumber(blob.tip_per_blob_gas))
  );

  const byEntity = new Map<string, BlobResponse[]>();
  for (const blob of blobs) {
    const entity = blob.user_attribution?.trim() || UNATTRIBUTED_ENTITY;
    const group = byEntity.get(entity);
    if (group) {
      group.push(blob);
    } else {
      byEntity.set(entity, [blob]);
    }
  }

  const cards: EntityReportCard[] = Array.from(byEntity.entries()).map(
    ([entity, group]) => {
      const avgFillPercent = mean(
        group.map((blob) => fillPercent(blob.blob_size_bytes))
      );
      const avgTipWei = mean(
        group.map((blob) => parseWeiNumber(blob.tip_per_blob_gas))
      );
      const headroomValues = group
        .map((blob) => parsePercent(blob.fee_cap_headroom_percent))
        .filter((value): value is number => value !== null);
      const avgHeadroomPercent =
        headroomValues.length > 0 ? mean(headroomValues) : null;

      const metrics: EntityEfficiencyMetrics = {
        entity,
        blobCount: group.length,
        avgFillPercent,
        avgTipWei,
        tipToMedianRatio: tipRatio(avgTipWei, medianTipWei),
        avgHeadroomPercent,
        headroomSampleCount: headroomValues.length,
      };

      return { ...metrics, grade: gradeMetrics(metrics) };
    }
  );

  cards.sort(
    (a, b) =>
      b.grade.score - a.grade.score ||
      b.blobCount - a.blobCount ||
      a.entity.localeCompare(b.entity)
  );

  return { sampleSize: blobs.length, medianTipWei, cards };
}
