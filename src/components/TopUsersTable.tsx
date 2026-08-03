"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CircleHelp,
} from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { BackendUsersRange, User } from '../types';
import DataStateWrapper from './DataStateWrapper';
import { useNetwork } from '../hooks/useNetwork';
import { useTopUsers } from '../hooks/useTopUsers';
import { useTimeRange, type TimeRange } from '../contexts/TimeRangeContext';
import {
  assignSeriesColors,
  attributionColorKey,
  type SeriesColorInput,
} from '../utils';
import AttributionBadge from './AttributionBadge';
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
import { useFlipRows } from '../hooks/useFlipRows';
import { useRankMovements } from '../hooks/useRankMovements';
import { RankMarker, RankMovementIndicator } from './RankIndicators';
import {
  competitionRanks,
  normalizeAddress,
  toRankSnapshotEntries,
} from '../lib/rankMovement';
import { formatRelativeTime } from '../lib/api/core';

// On phones the name column keeps the lion's share so attribution names stay
// readable; Rank, Count and % of Total shrink to fit their compact content.
const COLUMN_WIDTHS: Record<string, string> = {
  rank: 'w-[15%] sm:w-[12%]',
  name: 'w-[45%] sm:w-[30%]',
  dataCount: 'w-[22%] sm:w-[29%]',
  percentage: 'w-[18%] sm:w-[29%]',
};
// Overrides the table primitives' px-6, which is too wide for phone columns.
const CELL_PADDING = 'px-3 sm:px-6';
const EMPTY_USERS: User[] = [];

const ROW_BASE_CLASS =
  'cursor-pointer hover:bg-gradient-to-r hover:from-[#1f2127]/70 hover:to-[#23252b]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-inset';
const DEFAULT_ROW_GRADIENT = 'bg-gradient-to-r from-[#17181b] to-[#141519]/60';
// Podium rows (ranks 1-3) get a medal-colored inset accent and a faint warm
// tint. Inset shadows do not shift layout, so useFlipRows measurements stay
// accurate while rows animate between positions.
const PODIUM_ROW_CLASSES: Record<number, string> = {
  1: 'bg-gradient-to-r from-[#221d10]/80 to-[#141519]/60 shadow-[inset_3px_0_0_#d4a94a]',
  2: 'bg-gradient-to-r from-[#1d2025]/80 to-[#141519]/60 shadow-[inset_3px_0_0_#9aa4b2]',
  3: 'bg-gradient-to-r from-[#211a13]/80 to-[#141519]/60 shadow-[inset_3px_0_0_#b0714a]',
};

const RANGE_LABELS: Record<TimeRange, string> = {
  '1h': 'Last hour',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

/**
 * Unattributed users are displayed under their truncated address; give them
 * the shared "unknown" neutral instead of a hashed hue so an address never
 * masquerades as a named network.
 */
function userColorInput(user: User): SeriesColorInput {
  return {
    key: attributionColorKey(user.name),
    category: user.attributed ? undefined : 'unknown',
  };
}

function sortLabel(direction: false | 'asc' | 'desc'): string {
  if (direction === 'asc') return ', sorted ascending';
  if (direction === 'desc') return ', sorted descending';
  return '';
}

function SortableHeader<TData, TValue>({
  column,
  children,
}: {
  column: Column<TData, TValue>;
  children: React.ReactNode;
}) {
  const sortDirection = column.getIsSorted();
  const SortIcon = sortDirection === 'asc' ? ArrowUp : sortDirection === 'desc' ? ArrowDown : ArrowUpDown;

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

function ariaSort(direction: false | 'asc' | 'desc'): 'ascending' | 'descending' | 'none' {
  if (direction === 'asc') return 'ascending';
  if (direction === 'desc') return 'descending';
  return 'none';
}

function UserIdentity({ user, podium }: { user: User; podium: boolean }) {
  return (
    <div className="flex min-w-0 items-center">
      <AttributionBadge
        user={user.name}
        sizeClass={podium ? 'h-6 w-6' : 'h-5 w-5'}
        className="mr-3"
        textClass={podium ? 'text-[11px]' : 'text-[10px]'}
      />
      <span className={`truncate ${podium ? 'text-[15px] font-medium' : ''}`}>{user.name}</span>
    </div>
  );
}

export default function TopUsersTable() {
  const router = useRouter();
  const { selectedNetwork } = useNetwork();
  const { timeRange } = useTimeRange();
  const usersRange: BackendUsersRange = timeRange;
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'dataCount', desc: true },
  ]);

  // Shares its cache entry and live users_update fold with the Top User
  // metric card via useTopUsers, so the two can never disagree.
  const {
    data: displayData,
    isLoading,
    error,
    scopeKey: liveScopeKey,
  } = useTopUsers(10, selectedNetwork.apiParam, usersRange);
  const tableData = displayData?.data ?? EMPTY_USERS;
  const tbodyRef = React.useRef<HTMLTableSectionElement | null>(null);
  useFlipRows(tbodyRef, liveScopeKey);

  // Movement is relative to the ranking last seen for this scope, persisted
  // in localStorage; the backend has no historical-rank endpoint to diff
  // against. Ranks are recomputed from counts (ties share a rank) instead of
  // trusting row order, so they stay attached to users under column sorting.
  const { movements, baselineAt } = useRankMovements(liveScopeKey, tableData);
  const ranks = React.useMemo(
    () => competitionRanks(toRankSnapshotEntries(tableData)),
    [tableData]
  );

  const userColors = React.useMemo(
    () => assignSeriesColors(tableData.map(userColorInput)),
    [tableData]
  );

  const columns = React.useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: 'rank',
        enableSorting: false,
        header: () => (
          <>
            <span aria-hidden="true">#</span>
            <span className="sr-only">Rank</span>
          </>
        ),
        cell: ({ row }) => {
          const key = normalizeAddress(row.original.address);
          return (
            <div className="flex items-center gap-1.5">
              <RankMarker rank={ranks.get(key) ?? row.original.id} />
              <RankMovementIndicator movement={movements.get(key)} />
            </div>
          );
        },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <SortableHeader column={column}>User</SortableHeader>
        ),
        cell: ({ row }) => {
          const rank = ranks.get(normalizeAddress(row.original.address));
          return <UserIdentity user={row.original} podium={rank !== undefined && rank <= 3} />;
        },
      },
      {
        accessorKey: 'dataCount',
        header: ({ column }) => (
          <div className="flex items-center gap-1">
            <SortableHeader column={column}>Count</SortableHeader>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="hidden rounded-sm text-[#6e7787] hover:text-bodyText focus:outline-none focus:ring-2 focus:ring-blue sm:inline-flex"
                  aria-label="Recent indexed activity"
                >
                  <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{RANGE_LABELS[timeRange]}</TooltipContent>
            </Tooltip>
          </div>
        ),
        cell: ({ row }) => row.original.dataCount,
      },
      {
        accessorKey: 'percentage',
        header: ({ column }) => (
          <SortableHeader column={column}>
            <span className="sm:hidden">%</span>
            <span className="hidden sm:inline">% of Total</span>
          </SortableHeader>
        ),
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="flex items-center">
              <span className="mr-3">{user.percentage}%</span>
              <div className="hidden h-2.5 w-32 rounded-full bg-[#2a2f37] sm:block">
                <div
                  className="h-2.5 rounded-full"
                  style={{
                    width: `${user.percentage}%`,
                    backgroundColor: userColors[attributionColorKey(user.name)],
                  }}
                />
              </div>
            </div>
          );
        },
      },
    ],
    [timeRange, userColors, ranks, movements]
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const goToUser = React.useCallback(
    (address: string) => {
      router.push(`/user/${address}`);
    },
    [router]
  );

  const handleRowKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>, address: string) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        goToUser(address);
      }
    },
    [goToUser]
  );

  const loadingComponent = (
    <div className="overflow-x-auto rounded-lg border border-divider">
      <Table className="min-w-full table-fixed overflow-hidden">
        <TableHeader>
          <TableRow className="bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <TableHead className={`${CELL_PADDING} ${COLUMN_WIDTHS.rank}`}>
              <span aria-hidden="true">#</span>
              <span className="sr-only">Rank</span>
            </TableHead>
            <TableHead className={`${CELL_PADDING} ${COLUMN_WIDTHS.name}`}>User</TableHead>
            <TableHead className={`whitespace-nowrap ${CELL_PADDING} ${COLUMN_WIDTHS.dataCount}`}>
              Count
            </TableHead>
            <TableHead className={`${CELL_PADDING} ${COLUMN_WIDTHS.percentage}`}>
              <span className="sm:hidden">%</span>
              <span className="hidden sm:inline">% of Total</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-divider">
          {[...Array(5)].map((_, index) => (
            <TableRow key={index} className="bg-gradient-to-r from-[#17181b] to-[#141519]/60">
              <TableCell className={CELL_PADDING}>
                <Skeleton className="h-6 w-6 rounded-full" />
              </TableCell>
              <TableCell className={CELL_PADDING}>
                <div className="flex min-w-0 items-center">
                  <Skeleton className="mr-3 h-5 w-5 shrink-0 rounded-full" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </TableCell>
              <TableCell className={CELL_PADDING}>
                <Skeleton className="h-5 w-12" />
              </TableCell>
              <TableCell className={CELL_PADDING}>
                <div className="flex items-center">
                  <Skeleton className="mr-3 h-5 w-12" />
                  <div className="hidden h-2.5 w-32 rounded-full bg-[#2a2f37] sm:block">
                    <Skeleton className="h-2.5 w-3/5 rounded-full" />
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <section>
      <h2 className="mb-4 flex flex-wrap items-center gap-3 text-2xl font-windsor-bold text-white">
        Top Blob Users{' '}
        <span className="whitespace-nowrap rounded-full border border-divider bg-container px-2.5 py-0.5 font-gt-flexa text-xs font-normal text-[#8a93a5]">
          {RANGE_LABELS[timeRange]}
        </span>
      </h2>

      <DataStateWrapper
        isLoading={isLoading && !displayData}
        error={displayData ? null : error}
        loadingComponent={loadingComponent}
      >
        {displayData && (
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
              <TableBody ref={tbodyRef} className="divide-y divide-divider">
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.original.address}
                    data-row-key={row.original.address}
                    className={`${ROW_BASE_CLASS} ${
                      PODIUM_ROW_CLASSES[
                        ranks.get(normalizeAddress(row.original.address)) ?? 0
                      ] ?? DEFAULT_ROW_GRADIENT
                    }`}
                    onClick={() => goToUser(row.original.address)}
                    onKeyDown={(event) => handleRowKeyDown(event, row.original.address)}
                    tabIndex={0}
                    role="link"
                    aria-label={`View activity for ${row.original.name}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={`whitespace-nowrap text-sm text-white ${CELL_PADDING} ${COLUMN_WIDTHS[cell.column.id]}`}
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

      {displayData && baselineAt !== null && movements.size > 0 && (
        <p className="mt-2 text-xs text-[#6e7787]">
          Rank movement compares against the leaderboard you last saw for this window
          ({formatRelativeTime(new Date(baselineAt).toISOString())}).
        </p>
      )}
    </section>
  );
}
