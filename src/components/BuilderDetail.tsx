"use client";

import React, { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CircleHelp } from 'lucide-react';
import Link from '@/components/NetworkLink';
import AttributionBadge from '@/components/AttributionBadge';
import CopyButton from '@/components/CopyButton';
import DataStateWrapper from '@/components/DataStateWrapper';
import StatCard from '@/components/StatCard';
import { RelativeTime } from '@/components/RelativeTime';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { entityPagePath } from '@/lib/entityLink';
import {
  BUILDER_COVERAGE_NOTE,
  BUILDER_RANGE_DESCRIPTIONS,
  BUILDER_RANGE_OPTIONS,
  DEFAULT_BUILDER_RANGE,
  ELIGIBLE_SKIPPED_TOOLTIP,
  TIME_TO_INCLUSION_TOOLTIP,
  builderDisplayName,
  formatInclusionIndex,
  formatTimeToInclusion,
  inclusionIndexTone,
  isBuilderRange,
} from '@/lib/builders';
import { PRIORITY_FEE_TOOLTIP } from '@/constants';
import type {
  BackendBuilderDetailResponse,
  BackendBuilderRecentBlock,
  BackendBuilderSkippedRow,
  BackendBuilderStats,
  BackendBuilderUserRow,
  BuilderRange,
} from '@/types';
import {
  formatGwei,
  formatLocalTimestamp,
  formatNumber,
  formatPercent,
  formatWeiToEth,
  formatWeiToGwei,
  truncateAddress,
} from '@/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

const REFRESH_INTERVAL_MS = 60_000;

// Overrides the table primitives' px-6, which is too wide for phone columns.
const CELL_PADDING = 'px-2 sm:px-6';

const CARD_SUBLINE = 'mt-1 text-xs font-normal text-[#8a93a5]';

const INCLUSION_INDEX_TOOLTIP =
  'Inclusion index is the sender’s share of this builder’s blobs divided by its share ' +
  'of all blobs. 1 is neutral; the value is highlighted above 1.5x (this builder ' +
  'carries more of the sender than the network does) and below 0.67x (it carries less).';

const UNREGISTERED_BUILDER_TOOLTIP =
  'This builder is not in the registry, so its key was derived from the block itself: ' +
  'an extra: key comes from the block’s extra data, an addr: key from its fee ' +
  'recipient. Blocks from one operator can end up under several derived keys.';

const NO_SNAPSHOT_TOOLTIP =
  'None of this builder’s blocks in this window were indexed live, so our node holds ' +
  'no record of what was pending at their slot starts. That is missing data, not zero ' +
  'skipped transactions.';

/** The identity columns every sender row carries, in both sender tables. */
type BuilderSenderRow = Pick<BackendBuilderUserRow, 'key' | 'name' | 'is_entity'>;

/**
 * Display name for a key whose builder the API did not return, so there is no
 * name to fall back on. The prefix names where the key came from rather than
 * the builder, so it is dropped, and a bare fee recipient is truncated.
 */
function builderKeyLabel(key: string): string {
  const bare = key.replace(/^(extra|addr):/, '').trim();
  if (!bare) return 'This builder';
  return /^0x[0-9a-fA-F]{40}$/.test(bare) ? truncateAddress(bare) : bare;
}

function HeaderHint({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex rounded-sm text-[#6e7787] hover:text-bodyText focus:outline-none focus:ring-2 focus:ring-blue"
          aria-label={label}
        >
          <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs normal-case">{children}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Sender identity, linked to whichever page aggregates it: attributed rows to
 * the entity page, bare addresses to their own page.
 */
function SenderCell({ row }: { row: BuilderSenderRow }) {
  const name = row.name?.trim() || row.key;
  const display = row.is_entity ? name : truncateAddress(row.key);
  const href = row.is_entity ? entityPagePath(name) : `/user/${row.key}`;

  return (
    <div className="flex min-w-0 items-center">
      <AttributionBadge
        user={row.is_entity ? name : display}
        sizeClass="h-5 w-5"
        className="mr-3"
        textClass="text-[10px]"
      />
      {href ? (
        <Link href={href} className="truncate text-blue hover:underline" title={row.key}>
          {display}
        </Link>
      ) : (
        <span className="truncate" title={row.key}>
          {display}
        </span>
      )}
    </div>
  );
}

function InclusionIndexCell({ index }: { index: number | null }) {
  const tone = inclusionIndexTone(index);
  const toneClass =
    tone === 'favored' ? 'text-green' : tone === 'disfavored' ? 'text-[#ff8f8f]' : '';

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`tabular-nums ${toneClass}`}>{formatInclusionIndex(index)}</span>
      {tone !== 'neutral' && (
        <span className={`text-[10px] uppercase tracking-wider ${toneClass}`}>
          {tone === 'favored' ? 'favored' : 'under-included'}
        </span>
      )}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-2xl font-windsor-bold text-white">{children}</h2>;
}

function EmptyTableRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <TableRow className="bg-gradient-to-r from-[#17181b] to-[#141519]/60">
      <TableCell
        colSpan={colSpan}
        className={`${CELL_PADDING} py-8 text-center text-sm text-[#6c727f]`}
      >
        {children}
      </TableCell>
    </TableRow>
  );
}

const ROW_CLASS =
  'bg-gradient-to-r from-[#17181b] to-[#141519]/60 hover:bg-gradient-to-r hover:from-[#1f2127]/70 hover:to-[#23252b]/70';

function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-divider">
      <Table className="min-w-full overflow-hidden">{children}</Table>
    </div>
  );
}

function StatCards({ builder }: { builder: BackendBuilderStats }) {
  const payment = builder.proposer_payment_wei;
  const tip = builder.tip;
  const inclusion = builder.time_to_inclusion_ms;
  const candidates = builder.candidates;

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="Blocks"
        value={
          <>
            {formatNumber(builder.blocks)}
            <div className={CARD_SUBLINE}>
              {formatPercent(builder.block_share_percent)} of attributed blocks
            </div>
          </>
        }
      />
      <StatCard label="Blob blocks" value={formatNumber(builder.blob_blocks)} />
      <StatCard
        label="Blobs"
        value={
          <>
            {formatNumber(builder.blobs)}
            <div className={CARD_SUBLINE}>
              {formatPercent(builder.blob_share_percent)} of attributed blobs
            </div>
          </>
        }
      />
      <StatCard
        label="Full blocks"
        value={formatNumber(builder.full_blocks)}
        title="Blocks that used every blob slot the network allowed."
      />
      <StatCard
        label="Avg blobs per blob block"
        value={builder.avg_blobs_per_blob_block.toFixed(2)}
      />
      <StatCard
        label="MEV-Boost blocks"
        value={formatNumber(builder.mev_boost_blocks)}
        title="Blocks delivered through a relay rather than built by the proposer itself."
      />
      <StatCard
        label="Proposer payment (median)"
        value={payment ? formatWeiToEth(payment.median, true) : '-'}
        title={
          payment
            ? `Total ${formatWeiToEth(payment.total, true)} paid to proposers in this window.`
            : 'No proposer payment was recorded for this builder in this window.'
        }
      />
      <StatCard
        label="Tip band (p10 · p50 · p90)"
        value={
          tip ? (
            <span className="text-sm">
              {formatGwei(tip.p10_gwei, 4)} · {formatGwei(tip.p50_gwei, 4)} ·{' '}
              {formatGwei(tip.p90_gwei, 4)}
            </span>
          ) : (
            '-'
          )
        }
        title={PRIORITY_FEE_TOOLTIP}
      />
      <StatCard
        label="Time to inclusion (p50)"
        value={
          inclusion ? (
            <>
              {formatTimeToInclusion(inclusion.p50)}
              <div className={CARD_SUBLINE}>
                p90 {formatTimeToInclusion(inclusion.p90)} ·{' '}
                {formatNumber(inclusion.sample_count)} samples
              </div>
            </>
          ) : (
            '-'
          )
        }
        title={TIME_TO_INCLUSION_TOOLTIP}
      />
      <StatCard
        label="Eligible skipped"
        value={
          candidates ? (
            <>
              {formatNumber(candidates.eligible_skipped_txs)} txs
              <div className={CARD_SUBLINE}>
                {formatNumber(candidates.eligible_skipped_blobs)} blobs across{' '}
                {formatNumber(candidates.blocks_with_eligible_skipped)} of{' '}
                {formatNumber(candidates.snapshot_blocks)} snapshot blocks
                {candidates.eligible_skipped_max_tip_gwei
                  ? `, max tip ${formatGwei(candidates.eligible_skipped_max_tip_gwei, 4)}`
                  : ''}
              </div>
            </>
          ) : (
            <span className="text-[#8a93a5]">No snapshot</span>
          )
        }
        title={candidates ? ELIGIBLE_SKIPPED_TOOLTIP : NO_SNAPSHOT_TOOLTIP}
      />
    </div>
  );
}

function UsersSection({ users }: { users: BackendBuilderUserRow[] }) {
  return (
    <section className="mb-8">
      <SectionHeading>Who this builder includes</SectionHeading>
      <TableShell>
        <TableHeader>
          <TableRow className="bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <TableHead className={CELL_PADDING}>Sender</TableHead>
            <TableHead className={`whitespace-nowrap ${CELL_PADDING}`}>Blobs</TableHead>
            <TableHead className={`whitespace-nowrap ${CELL_PADDING}`}>
              Share within builder
            </TableHead>
            <TableHead className={`hidden whitespace-nowrap md:table-cell ${CELL_PADDING}`}>
              Share overall
            </TableHead>
            <TableHead className={`whitespace-nowrap ${CELL_PADDING}`}>
              <span className="inline-flex items-center gap-1">
                Inclusion index
                <HeaderHint label="How the inclusion index is measured">
                  {INCLUSION_INDEX_TOOLTIP}
                </HeaderHint>
              </span>
            </TableHead>
            <TableHead className={`hidden whitespace-nowrap lg:table-cell ${CELL_PADDING}`}>
              <span className="inline-flex items-center gap-1">
                Tip p50
                <HeaderHint label="How the tip is measured">{PRIORITY_FEE_TOOLTIP}</HeaderHint>
              </span>
            </TableHead>
            <TableHead className={`hidden whitespace-nowrap lg:table-cell ${CELL_PADDING}`}>
              <span className="inline-flex items-center gap-1">
                Time to inclusion p50
                <HeaderHint label="How time to inclusion is measured">
                  {TIME_TO_INCLUSION_TOOLTIP}
                </HeaderHint>
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-divider">
          {users.length === 0 && (
            <EmptyTableRow colSpan={7}>
              No blob transactions included in this window.
            </EmptyTableRow>
          )}
          {users.map((row) => (
            <TableRow key={row.key} className={ROW_CLASS}>
              <TableCell className={`text-sm text-white ${CELL_PADDING}`}>
                <SenderCell row={row} />
              </TableCell>
              <TableCell className={`whitespace-nowrap text-sm text-white ${CELL_PADDING}`}>
                <span className="tabular-nums">{formatNumber(row.blobs)}</span>
                <div className={CARD_SUBLINE}>{formatNumber(row.tx_count)} txs</div>
              </TableCell>
              <TableCell
                className={`whitespace-nowrap text-sm tabular-nums text-white ${CELL_PADDING}`}
              >
                {formatPercent(row.share_within_builder_percent)}
              </TableCell>
              <TableCell
                className={`hidden whitespace-nowrap text-sm tabular-nums text-white md:table-cell ${CELL_PADDING}`}
              >
                {formatPercent(row.share_overall_percent)}
              </TableCell>
              <TableCell className={`whitespace-nowrap text-sm text-white ${CELL_PADDING}`}>
                <InclusionIndexCell index={row.inclusion_index} />
              </TableCell>
              <TableCell
                className={`hidden whitespace-nowrap text-sm tabular-nums text-white lg:table-cell ${CELL_PADDING}`}
              >
                {row.tip_p50_gwei ? formatGwei(row.tip_p50_gwei, 4) : '-'}
              </TableCell>
              <TableCell
                className={`hidden whitespace-nowrap text-sm tabular-nums text-white lg:table-cell ${CELL_PADDING}`}
                title={
                  row.time_to_inclusion_ms
                    ? `${formatNumber(row.time_to_inclusion_ms.sample_count)} samples`
                    : undefined
                }
              >
                {formatTimeToInclusion(row.time_to_inclusion_ms?.p50)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableShell>
    </section>
  );
}

function SkippedSection({
  skipped,
  hasSnapshot,
  detailFrom,
}: {
  skipped: BackendBuilderSkippedRow[];
  hasSnapshot: boolean;
  /** Earliest block the rows cover, when older candidate detail was pruned. */
  detailFrom?: string | null;
}) {
  return (
    <section className="mb-8">
      <SectionHeading>Eligible and skipped</SectionHeading>
      <p className="mb-4 max-w-3xl text-sm text-[#8a93a5]">
        These are pending blob transactions our own node could see that this builder&apos;s
        blocks did not include. {ELIGIBLE_SKIPPED_TOOLTIP}
      </p>
      {/* The aggregate card above is permanent, but the rows come from
          per-transaction detail the indexer prunes, so over a long range they
          cover less than the card does and the two are not meant to add up. */}
      {hasSnapshot && detailFrom && (
        <p className="mb-4 max-w-3xl text-xs text-[#6e7787]">
          Per-sender detail covers blocks from {formatLocalTimestamp(detailFrom)} onward;
          older candidate detail has been pruned, so these rows sum to less than the
          eligible skipped total above.
        </p>
      )}
      {hasSnapshot ? (
        <TableShell>
          <TableHeader>
            <TableRow className="bg-gradient-to-b from-[#22252c] to-[#16171b]">
              <TableHead className={CELL_PADDING}>Sender</TableHead>
              <TableHead className={`whitespace-nowrap ${CELL_PADDING}`}>Txs</TableHead>
              <TableHead className={`whitespace-nowrap ${CELL_PADDING}`}>Blobs</TableHead>
              <TableHead className={`hidden whitespace-nowrap md:table-cell ${CELL_PADDING}`}>
                Max tip
              </TableHead>
              <TableHead className={`hidden whitespace-nowrap md:table-cell ${CELL_PADDING}`}>
                Median tip
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-divider">
            {skipped.length === 0 && (
              <EmptyTableRow colSpan={5}>
                Nothing eligible was left pending in the snapshot blocks.
              </EmptyTableRow>
            )}
            {skipped.map((row) => (
              <TableRow key={row.key} className={ROW_CLASS}>
                <TableCell className={`text-sm text-white ${CELL_PADDING}`}>
                  <SenderCell row={row} />
                </TableCell>
                <TableCell
                  className={`whitespace-nowrap text-sm tabular-nums text-white ${CELL_PADDING}`}
                >
                  {formatNumber(row.txs)}
                </TableCell>
                <TableCell
                  className={`whitespace-nowrap text-sm tabular-nums text-white ${CELL_PADDING}`}
                >
                  {formatNumber(row.blobs)}
                </TableCell>
                <TableCell
                  className={`hidden whitespace-nowrap text-sm tabular-nums text-white md:table-cell ${CELL_PADDING}`}
                >
                  {row.max_tip_gwei ? formatGwei(row.max_tip_gwei, 4) : '-'}
                </TableCell>
                <TableCell
                  className={`hidden whitespace-nowrap text-sm tabular-nums text-white md:table-cell ${CELL_PADDING}`}
                >
                  {row.p50_tip_gwei ? formatGwei(row.p50_tip_gwei, 4) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableShell>
      ) : (
        <div className="rounded-lg border border-divider bg-gradient-to-r from-[#17181b] to-[#141519]/60 p-4">
          <p className="text-sm text-[#8a93a5]">
            No candidate snapshot exists for this builder in this window: none of its blocks
            were indexed live, so our node never recorded what was pending at their slot
            starts.
          </p>
        </div>
      )}
    </section>
  );
}

function RecentBlocksSection({ blocks }: { blocks: BackendBuilderRecentBlock[] }) {
  return (
    <section className="mb-8">
      <SectionHeading>Recent blocks</SectionHeading>
      <TableShell>
        <TableHeader>
          <TableRow className="bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <TableHead className={CELL_PADDING}>Block</TableHead>
            <TableHead className={`whitespace-nowrap ${CELL_PADDING}`}>Blobs</TableHead>
            <TableHead className={`hidden whitespace-nowrap md:table-cell ${CELL_PADDING}`}>
              Proposer payment
            </TableHead>
            <TableHead className={`whitespace-nowrap ${CELL_PADDING}`}>
              <span className="inline-flex items-center gap-1">
                Eligible skipped
                <HeaderHint label="What eligible skipped means">
                  {ELIGIBLE_SKIPPED_TOOLTIP}
                </HeaderHint>
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-divider">
          {blocks.length === 0 && (
            <EmptyTableRow colSpan={4}>No blocks in this window.</EmptyTableRow>
          )}
          {blocks.map((block) => (
            <TableRow key={block.number} className={ROW_CLASS}>
              <TableCell className={`whitespace-nowrap text-sm text-white ${CELL_PADDING}`}>
                <Link
                  href={`/block/${block.number}`}
                  className="tabular-nums text-blue hover:underline"
                >
                  {formatNumber(block.number)}
                </Link>
                <div className={CARD_SUBLINE}>
                  <RelativeTime timestamp={block.timestamp} />
                </div>
              </TableCell>
              <TableCell
                className={`whitespace-nowrap text-sm tabular-nums text-white ${CELL_PADDING}`}
              >
                {formatNumber(block.blob_count)}
                {block.blob_params_max !== undefined && (
                  <span className="text-[#6e7787]">/{formatNumber(block.blob_params_max)}</span>
                )}
              </TableCell>
              <TableCell
                className={`hidden whitespace-nowrap text-sm tabular-nums text-white md:table-cell ${CELL_PADDING}`}
              >
                {block.proposer_payment_wei
                  ? formatWeiToEth(block.proposer_payment_wei, true)
                  : '-'}
              </TableCell>
              <TableCell className={`whitespace-nowrap text-sm text-white ${CELL_PADDING}`}>
                {block.candidate_snapshot ? (
                  <>
                    <span className="tabular-nums">
                      {formatNumber(block.eligible_skipped_txs ?? 0)}
                    </span>
                    {block.eligible_skipped_max_tip && (
                      <div className={CARD_SUBLINE}>
                        max tip {formatWeiToGwei(block.eligible_skipped_max_tip, 4)}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-[#6e7787]" title={NO_SNAPSHOT_TOOLTIP}>
                    no snapshot
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableShell>
    </section>
  );
}

function BuilderDetailInner({ builderKey }: { builderKey: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedNetwork } = useNetwork();

  // The URL is the only range state: the pills rewrite ?range=, so the address
  // bar always states the window on screen and a shared link opens on it.
  const rangeParam = searchParams.get('range');
  const range: BuilderRange = isBuilderRange(rangeParam) ? rangeParam : DEFAULT_BUILDER_RANGE;

  // Null means the lookup settled and this builder produced no block in the
  // window on the selected network, which a short range hits often; undefined
  // means it is still loading.
  const { data, isLoading, error } = useApiData<BackendBuilderDetailResponse | null>(
    () => api.getBuilderByKey(builderKey, range, selectedNetwork.apiParam),
    ['builder', selectedNetwork.apiParam, builderKey, range],
    { refetchInterval: REFRESH_INTERVAL_MS }
  );
  const builderNotFound = data === null;
  const builder = data?.builder;
  const displayName = builder ? builderDisplayName(builder) : builderKeyLabel(builderKey);

  const handleRangeChange = (next: BuilderRange) => {
    if (next === range) return;
    trackEvent('time-range-change', { range: next, previous: range });
    // Replace rather than push: a window change is not a navigation worth a
    // history entry. Unrelated query params survive the rewrite.
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const loadingComponent = (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-5 w-80" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-divider bg-gradient-to-b from-[#22252c] to-[#16171b] p-4"
          >
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <Link
        href="/builders"
        className="mb-6 inline-flex items-center gap-2 text-sm text-blue hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Builders
      </Link>

      <div
        className="mb-4 flex items-center space-x-1 rounded-md bg-background/30 p-0.5"
        role="group"
        aria-label="Time window"
      >
        {BUILDER_RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleRangeChange(option.value)}
            aria-pressed={option.value === range}
            className={`rounded-md px-3 py-1 text-sm transition-none ${
              option.value === range
                ? 'border border-divider border-b-2 border-b-[#282a2f] bg-[#1d1f23] text-white'
                : 'border border-transparent text-white hover:text-white/90'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <DataStateWrapper
        isLoading={isLoading && !data}
        error={data ? null : error}
        loadingComponent={loadingComponent}
      >
        {builderNotFound && (
          <div className="rounded-lg border border-divider bg-[#14161a] p-6">
            <h1 className="mb-2 text-2xl font-windsor-bold text-white">{displayName}</h1>
            <p className="mb-4 break-all font-mono text-sm text-bodyText">{builderKey}</p>
            <p className="text-sm text-bodyText">
              {displayName} built no blocks on {selectedNetwork.name} in{' '}
              {BUILDER_RANGE_DESCRIPTIONS[range]}. Try a wider range.
            </p>
          </div>
        )}

        {data && builder && (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-windsor-bold text-white">{displayName}</h1>
              {!builder.known && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      className="rounded border border-divider px-2 py-0.5 text-xs uppercase tracking-wider text-[#8a93a5]"
                    >
                      Unregistered builder
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {UNREGISTERED_BUILDER_TOOLTIP}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="mb-2 flex items-center gap-2">
              <span className="break-all font-mono text-sm text-bodyText">{builder.key}</span>
              <CopyButton value={builder.key} label="builder key" compact />
            </div>

            {builder.fee_recipients.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#8a93a5]">
                <span className="text-xs uppercase tracking-wider text-[#6e7787]">
                  Fee {builder.fee_recipients.length === 1 ? 'recipient' : 'recipients'}
                </span>
                {builder.fee_recipients.map((recipient) => (
                  <span key={recipient} className="inline-flex items-center gap-1">
                    <span className="font-mono" title={recipient}>
                      {truncateAddress(recipient)}
                    </span>
                    <CopyButton value={recipient} label="fee recipient address" compact />
                  </span>
                ))}
              </div>
            )}

            <p className="mb-6 max-w-3xl text-sm text-[#6e7787]">{BUILDER_COVERAGE_NOTE}</p>

            <StatCards builder={builder} />
            <UsersSection users={data.users} />
            <SkippedSection
              skipped={data.skipped}
              hasSnapshot={builder.candidates !== null}
              detailFrom={data.skipped_detail_from}
            />
            <RecentBlocksSection blocks={data.recent_blocks} />
          </div>
        )}
      </DataStateWrapper>
    </div>
  );
}

/**
 * One block builder's detail view: what it built in the window, which senders
 * its blocks carry, the eligible pending blob transactions it left out, and
 * its recent blocks.
 *
 * The Suspense boundary is required: the inner component reads
 * useSearchParams for the ?range= deep link, which opts its subtree into
 * client rendering on the statically prerendered page.
 */
export default function BuilderDetail({ builderKey }: { builderKey: string }) {
  return (
    <Suspense fallback={null}>
      <BuilderDetailInner builderKey={builderKey} />
    </Suspense>
  );
}
