"use client";

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, CircleHelp } from 'lucide-react';
import {
  flexRender,
  useTable,
  type Column,
  type ColumnDef,
  type RowData,
  type SortingState,
} from '@tanstack/react-table';
import type { BackendBuilderStats, BackendBuildersResponse } from '@/types';
import DataStateWrapper from './DataStateWrapper';
import { useApiData } from '@/hooks/useApiData';
import { useBuilderRangeParam } from '@/hooks/useBuilderRangeParam';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import { sortableTableFeatures, type SortableTableFeatures } from '@/lib/tableFeatures';
import {
  BUILDER_COVERAGE_NOTE,
  BUILDER_RANGE_DESCRIPTIONS,
  BUILDER_RANGE_OPTIONS,
  ELIGIBLE_SKIPPED_TOOLTIP,
  TIME_TO_INCLUSION_TOOLTIP,
  builderDisplayName,
  builderPagePath,
  formatTimeToInclusion,
} from '@/lib/builders';
import { PRIORITY_FEE_TOOLTIP } from '@/constants';
import { assignSeriesColors, formatGwei, formatNumber, networkPath } from '@/utils';
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

/** One builder plus the rank its position in the server order gives it. */
interface BuilderRow extends BackendBuilderStats {
  rank: number;
}

// On phones only rank, builder, blocks, and blobs fit. The tip band and the
// inclusion timing join at md, and eligible skipped at lg, where the row has
// room for the widest of the three.
const COLUMN_WIDTHS: Record<string, string> = {
  rank: 'w-[9%] md:w-[6%]',
  name: 'w-[35%] md:w-[22%] lg:w-[20%]',
  blocks: 'w-[28%] md:w-[18%] lg:w-[16%]',
  blobs: 'w-[28%] md:w-[18%] lg:w-[16%]',
  tip: 'hidden md:table-cell md:w-[20%] lg:w-[18%]',
  inclusion: 'hidden md:table-cell md:w-[16%] lg:w-[13%]',
  skipped: 'hidden lg:table-cell lg:w-[17%]',
};
// Overrides the table primitives' px-6, which is too wide for phone columns.
const CELL_PADDING = 'px-2 sm:px-6';
const MUTED_TEXT = 'text-[#6c727f]';
const EMPTY_BUILDERS: BuilderRow[] = [];

const NO_SNAPSHOT_TITLE =
  'No block from this builder was indexed live, so our node holds no pending ' +
  'transaction snapshot to compare against.';

const GWEI_SUFFIX = ' Gwei';

/** Drop the unit so a three-value band does not repeat it three times. */
function withoutGweiUnit(formatted: string): string {
  return formatted.endsWith(GWEI_SUFFIX) ? formatted.slice(0, -GWEI_SUFFIX.length) : formatted;
}

/**
 * The tip band as "p10 · p50 · p90". Only the last value keeps its unit: all
 * three are Gwei, and repeating it crowds the column off narrow screens.
 */
export function formatTipBand(tip: NonNullable<BackendBuilderStats['tip']>): string {
  const p10 = withoutGweiUnit(formatGwei(tip.p10_gwei, 4));
  const p50 = withoutGweiUnit(formatGwei(tip.p50_gwei, 4));
  const p90 = formatGwei(tip.p90_gwei, 4);
  return `${p10} · ${p50} · ${p90}`;
}

// The three measured columns can have no measurement at all (no priced
// transaction, no inclusion sample, no candidate snapshot). That is not a
// low value, so the sort keys return undefined and the columns are declared
// sortUndefined: 'last', which keeps the unmeasured rows at the bottom in
// both directions instead of surfacing them as the smallest values.

/** Sort key for the tip band: the median. */
function tipSortValue(builder: BackendBuilderStats): number | undefined {
  if (!builder.tip) return undefined;
  const p50 = Number(builder.tip.p50_gwei);
  return Number.isFinite(p50) ? p50 : undefined;
}

/** Sort key for time to inclusion: the median. */
function inclusionSortValue(builder: BackendBuilderStats): number | undefined {
  const inclusion = builder.time_to_inclusion_ms;
  if (!inclusion || !Number.isFinite(inclusion.p50)) return undefined;
  return inclusion.p50;
}

/**
 * Sort key for eligible skipped. A missing snapshot is not zero skipped
 * transactions, it is no measurement, so it must never tie with a real zero.
 */
function skippedSortValue(builder: BackendBuilderStats): number | undefined {
  if (!builder.candidates) return undefined;
  return builder.candidates.eligible_skipped_txs;
}

/** Orders the measured values; unmeasured rows never reach this. */
function compareMeasured(a: number | undefined, b: number | undefined): number {
  return compareNumbers(a ?? 0, b ?? 0);
}

function compareNumbers(a: number, b: number): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function sortLabel(direction: false | 'asc' | 'desc'): string {
  if (direction === 'asc') return ', sorted ascending';
  if (direction === 'desc') return ', sorted descending';
  return '';
}

function SortableHeader<TData extends RowData, TValue>({
  column,
  children,
}: {
  column: Column<SortableTableFeatures, TData, TValue>;
  children: React.ReactNode;
}) {
  const sortDirection = column.getIsSorted();
  const SortIcon =
    sortDirection === 'asc' ? ArrowUp : sortDirection === 'desc' ? ArrowDown : ArrowUpDown;

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-left"
      onClick={column.getToggleSortingHandler()}
      aria-label={`${typeof children === 'string' ? children : column.id}${sortLabel(sortDirection)}`}
    >
      {children}
      <SortIcon className="h-3.5 w-3.5 text-[#6e7787]" aria-hidden="true" />
    </button>
  );
}

function HeaderHelp({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="hidden rounded-sm text-[#6e7787] hover:text-bodyText focus:outline-none focus:ring-2 focus:ring-blue sm:inline-flex"
          aria-label={label}
        >
          <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{children}</TooltipContent>
    </Tooltip>
  );
}

function ariaSort(direction: false | 'asc' | 'desc'): 'ascending' | 'descending' | 'none' {
  if (direction === 'asc') return 'ascending';
  if (direction === 'desc') return 'descending';
  return 'none';
}

function ShareBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="mt-1 hidden h-1.5 w-full max-w-24 rounded-full bg-[#2a2f37] sm:block">
      <div
        className="h-1.5 rounded-full"
        // An out-of-range share from the API would otherwise overflow the track.
        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function BuilderIdentity({ builder }: { builder: BuilderRow }) {
  return (
    <div className="flex min-w-0 flex-col">
      {/* The whole row is the link target, so the name carries the affordance
          for it: the blue the app gives its other row links, underlined
          whenever the row is hovered or focused. */}
      <span className="truncate text-blue underline-offset-2 group-hover:underline group-focus-visible:underline">
        {builderDisplayName(builder)}
      </span>
      {!builder.known && (
        <span
          className={`text-xs ${MUTED_TEXT}`}
          title="This key was derived from the block's extra data or fee recipient, not matched against a known builder."
        >
          unregistered
        </span>
      )}
    </div>
  );
}

function BuildersLeaderboardInner() {
  const router = useRouter();
  const { selectedNetwork } = useNetwork();
  const { range, setRange } = useBuilderRangeParam();

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'blocks', desc: true }]);

  const { data, isLoading, error } = useApiData<BackendBuildersResponse>(
    () => api.getBuilders(range, selectedNetwork.apiParam),
    ['builders', selectedNetwork.apiParam, range],
    { refetchInterval: REFRESH_INTERVAL_MS }
  );

  // The server orders by blocks in the window, so the index is the rank and
  // stays attached to its row through client-side re-sorts.
  const tableData = React.useMemo<BuilderRow[]>(
    () => data?.builders?.map((builder, index) => ({ ...builder, rank: index + 1 })) ?? EMPTY_BUILDERS,
    [data]
  );

  const builderColors = React.useMemo(
    () => assignSeriesColors(tableData.map((builder) => ({ key: builder.key }))),
    [tableData]
  );

  const columns = React.useMemo<ColumnDef<SortableTableFeatures, BuilderRow>[]>(
    () => [
      {
        id: 'rank',
        accessorKey: 'rank',
        header: () => <span aria-label="Rank">#</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums text-[#8a93a5]">{row.original.rank}</span>
        ),
      },
      {
        id: 'name',
        accessorFn: (builder) => builderDisplayName(builder),
        sortFn: 'alphanumeric',
        header: ({ column }) => <SortableHeader column={column}>Builder</SortableHeader>,
        cell: ({ row }) => <BuilderIdentity builder={row.original} />,
      },
      {
        id: 'blocks',
        accessorKey: 'blocks',
        header: ({ column }) => <SortableHeader column={column}>Blocks</SortableHeader>,
        cell: ({ row }) => {
          const builder = row.original;
          return (
            <div className="flex min-w-0 flex-col">
              <span className="tabular-nums">
                {formatNumber(builder.blocks)}
                <span className={`ml-1.5 text-xs ${MUTED_TEXT}`}>
                  {builder.block_share_percent.toFixed(1)}%
                </span>
              </span>
              <ShareBar
                percent={builder.block_share_percent}
                color={builderColors[builder.key]}
              />
              {builder.mev_boost_blocks > 0 && (
                <span className={`hidden truncate text-xs md:block ${MUTED_TEXT}`}>
                  {formatNumber(builder.mev_boost_blocks)} via MEV-Boost
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'blobs',
        accessorKey: 'blobs',
        header: ({ column }) => <SortableHeader column={column}>Blobs</SortableHeader>,
        cell: ({ row }) => {
          const builder = row.original;
          return (
            <div className="flex min-w-0 flex-col">
              <span className="tabular-nums">
                {formatNumber(builder.blobs)}
                <span className={`ml-1.5 text-xs ${MUTED_TEXT}`}>
                  {builder.blob_share_percent.toFixed(1)}%
                </span>
              </span>
              <span className={`truncate text-xs ${MUTED_TEXT}`}>
                {builder.avg_blobs_per_blob_block.toFixed(1)} avg/blob block
              </span>
            </div>
          );
        },
      },
      {
        id: 'tip',
        accessorFn: (builder) => tipSortValue(builder),
        sortUndefined: 'last',
        sortFn: (a, b) => compareMeasured(tipSortValue(a.original), tipSortValue(b.original)),
        header: ({ column }) => (
          <div className="flex items-center gap-1">
            <SortableHeader column={column}>Tip band</SortableHeader>
            <HeaderHelp label="How the tip band is measured">
              {PRIORITY_FEE_TOOLTIP}
            </HeaderHelp>
          </div>
        ),
        cell: ({ row }) => {
          const tip = row.original.tip;
          if (!tip) return <span className={MUTED_TEXT}>-</span>;
          return (
            <div className="flex min-w-0 flex-col">
              <span className="tabular-nums">{formatTipBand(tip)}</span>
              <span className={`truncate text-xs ${MUTED_TEXT}`}>p10 · p50 · p90</span>
            </div>
          );
        },
      },
      {
        id: 'inclusion',
        accessorFn: (builder) => inclusionSortValue(builder),
        sortUndefined: 'last',
        sortFn: (a, b) =>
          compareMeasured(inclusionSortValue(a.original), inclusionSortValue(b.original)),
        header: ({ column }) => (
          <div className="flex items-center gap-1">
            <SortableHeader column={column}>
              <span className="xl:hidden">Inclusion</span>
              <span className="hidden xl:inline">Time to inclusion</span>
            </SortableHeader>
            <HeaderHelp label="How time to inclusion is measured">
              {TIME_TO_INCLUSION_TOOLTIP}
            </HeaderHelp>
          </div>
        ),
        cell: ({ row }) => {
          const inclusion = row.original.time_to_inclusion_ms;
          if (!inclusion) return <span className={MUTED_TEXT}>-</span>;
          return (
            <div className="flex min-w-0 flex-col">
              <span className="tabular-nums">{formatTimeToInclusion(inclusion.p50)}</span>
              <span className={`truncate text-xs ${MUTED_TEXT}`}>
                p90 {formatTimeToInclusion(inclusion.p90)}, {formatNumber(inclusion.sample_count)}{' '}
                {inclusion.sample_count === 1 ? 'sample' : 'samples'}
              </span>
            </div>
          );
        },
      },
      {
        id: 'skipped',
        accessorFn: (builder) => skippedSortValue(builder),
        sortUndefined: 'last',
        sortFn: (a, b) =>
          compareMeasured(skippedSortValue(a.original), skippedSortValue(b.original)),
        header: ({ column }) => (
          <div className="flex items-center gap-1">
            <SortableHeader column={column}>Eligible skipped</SortableHeader>
            <HeaderHelp label="How eligible skipped is measured">
              {ELIGIBLE_SKIPPED_TOOLTIP}
            </HeaderHelp>
          </div>
        ),
        cell: ({ row }) => {
          const candidates = row.original.candidates;
          // No snapshot is the absence of a measurement, not a measured zero.
          if (!candidates) {
            return (
              <span className={MUTED_TEXT} title={NO_SNAPSHOT_TITLE}>
                no snapshot
              </span>
            );
          }
          return (
            <div className="flex min-w-0 flex-col">
              <span className="tabular-nums">
                {formatNumber(candidates.eligible_skipped_txs)}
              </span>
              <span className={`truncate text-xs ${MUTED_TEXT}`}>
                of {formatNumber(candidates.snapshot_blocks)} snapshot{' '}
                {candidates.snapshot_blocks === 1 ? 'block' : 'blocks'}
              </span>
            </div>
          );
        },
      },
    ],
    [builderColors]
  );

  const table = useTable({
    features: sortableTableFeatures,
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
  });

  // The detail page reads the same ?range= param, so the window travels with
  // the click: a builder seen on the 30d board must not open on a 24h view
  // where it may have built nothing.
  const goToRow = React.useCallback(
    (builder: BuilderRow) => {
      router.push(
        networkPath(`${builderPagePath(builder.key)}?range=${range}`, selectedNetwork.apiParam)
      );
    },
    [range, router, selectedNetwork.apiParam]
  );

  const handleRowKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>, builder: BuilderRow) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        goToRow(builder);
      }
    },
    [goToRow]
  );

  const loadingComponent = (
    <div className="overflow-x-auto rounded-lg border border-divider">
      <Table className="min-w-full table-fixed overflow-hidden">
        <TableHeader>
          <TableRow className="bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <TableHead className={`${CELL_PADDING} ${COLUMN_WIDTHS.rank}`}>#</TableHead>
            <TableHead className={`${CELL_PADDING} ${COLUMN_WIDTHS.name}`}>Builder</TableHead>
            <TableHead className={`whitespace-nowrap ${CELL_PADDING} ${COLUMN_WIDTHS.blocks}`}>
              Blocks
            </TableHead>
            <TableHead className={`whitespace-nowrap ${CELL_PADDING} ${COLUMN_WIDTHS.blobs}`}>
              Blobs
            </TableHead>
            <TableHead className={`whitespace-nowrap ${CELL_PADDING} ${COLUMN_WIDTHS.tip}`}>
              Tip band
            </TableHead>
            <TableHead className={`whitespace-nowrap ${CELL_PADDING} ${COLUMN_WIDTHS.inclusion}`}>
              Time to inclusion
            </TableHead>
            <TableHead className={`whitespace-nowrap ${CELL_PADDING} ${COLUMN_WIDTHS.skipped}`}>
              Eligible skipped
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-divider">
          {[...Array(10)].map((_, index) => (
            <TableRow key={index} className="bg-gradient-to-r from-[#17181b] to-[#141519]/60">
              <TableCell className={CELL_PADDING}>
                <Skeleton className="h-5 w-6" />
              </TableCell>
              <TableCell className={CELL_PADDING}>
                <Skeleton className="h-5 w-24" />
              </TableCell>
              <TableCell className={CELL_PADDING}>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell className={CELL_PADDING}>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell className={`${CELL_PADDING} hidden md:table-cell`}>
                <Skeleton className="h-5 w-24" />
              </TableCell>
              <TableCell className={`${CELL_PADDING} hidden md:table-cell`}>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell className={`${CELL_PADDING} hidden lg:table-cell`}>
                <Skeleton className="h-5 w-16" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div>
      <div
        className="mb-4 inline-flex items-center space-x-1 rounded-md bg-background/30 p-0.5"
        role="group"
        aria-label="Time window"
      >
        {BUILDER_RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setRange(option.value)}
            aria-pressed={option.value === range}
            className={`px-3 py-1 text-sm rounded-md transition-none ${option.value === range
              ? 'bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2'
              : 'text-white hover:text-white/90 border border-transparent'
              }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {data && (
        <div className="mb-4">
          {/* Attributed, not observed: these totals only cover blocks that
              carry a builder row, so the page never presents them as the
              whole network. */}
          <p
            className="text-sm text-bodyText"
            title={`Window: ${data.window.from} to ${data.window.to}`}
          >
            {`${formatNumber(data.totals.blocks)} blocks (${formatNumber(data.totals.blob_blocks)} with blobs), ${formatNumber(data.totals.blobs)} blobs attributed over ${BUILDER_RANGE_DESCRIPTIONS[range]}`}
          </p>
          <p className={`mt-1 text-xs ${MUTED_TEXT}`}>{BUILDER_COVERAGE_NOTE}</p>
        </div>
      )}

      <DataStateWrapper
        isLoading={isLoading && !data}
        error={data ? null : error}
        loadingComponent={loadingComponent}
      >
        {data && (
          <div className="overflow-x-auto rounded-lg border border-divider">
            <Table className="min-w-full table-fixed overflow-hidden">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="bg-gradient-to-b from-[#22252c] to-[#16171b]"
                  >
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      return (
                        <TableHead
                          key={header.id}
                          className={`${CELL_PADDING} ${COLUMN_WIDTHS[header.column.id]}`}
                          aria-sort={canSort ? ariaSort(header.column.getIsSorted()) : undefined}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="divide-y divide-divider">
                {tableData.length === 0 && (
                  <TableRow className="bg-gradient-to-r from-[#17181b] to-[#141519]/60">
                    <TableCell
                      colSpan={columns.length}
                      className={`${CELL_PADDING} py-8 text-center text-sm ${MUTED_TEXT}`}
                    >
                      No builder data in this window.
                    </TableCell>
                  </TableRow>
                )}
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.original.key}
                    className="group cursor-pointer bg-gradient-to-r from-[#17181b] to-[#141519]/60 hover:bg-gradient-to-r hover:from-[#1f2127]/70 hover:to-[#23252b]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-inset"
                    onClick={() => goToRow(row.original)}
                    onKeyDown={(event) => handleRowKeyDown(event, row.original)}
                    tabIndex={0}
                    role="link"
                    aria-label={`View builder stats for ${builderDisplayName(row.original)}`}
                  >
                    {row.getAllCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={`align-top whitespace-nowrap text-sm text-white ${CELL_PADDING} ${COLUMN_WIDTHS[cell.column.id]}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DataStateWrapper>
    </div>
  );
}

/**
 * Every block builder that produced an indexed block in the window, with its
 * block and blob share, the tips the blob transactions it included paid, how
 * long they waited, and the eligible pending blob transactions it left out.
 *
 * The Suspense boundary is required: the inner component reads
 * useSearchParams for the ?range= deep link, which opts its subtree into
 * client rendering on the statically prerendered page.
 */
export default function BuildersLeaderboard() {
  return (
    <Suspense fallback={null}>
      <BuildersLeaderboardInner />
    </Suspense>
  );
}
