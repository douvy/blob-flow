"use client";

import React, { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, CircleHelp } from 'lucide-react';
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
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { useNetwork } from '../hooks/useNetwork';
import { trackEvent } from '../lib/analytics';
import {
  assignSeriesColors,
  attributionColorKey,
  formatCostEthOrWei,
  formatNumber,
  networkPath,
  type SeriesColorInput,
} from '../utils';
import AttributionBadge from './AttributionBadge';
import { RelativeTime } from './RelativeTime';
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

export const USERS_LEADERBOARD_LIMIT = 50;

// The leaderboard gets no users_update overlay: those events carry however
// many rows the backend broadcasts (sized for the dashboard's table), and
// folding a shorter live list over a 50-row fetch would truncate the page.
const REFRESH_INTERVAL_MS = 60_000;

const RANGE_OPTIONS: ReadonlyArray<{ value: BackendUsersRange; label: string }> = [
  { value: '1h', label: '1h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'All' },
];

const RANGE_DESCRIPTIONS: Record<BackendUsersRange, string> = {
  '1h': 'the last hour',
  '24h': 'the last 24 hours',
  '7d': 'the last 7 days',
  '30d': 'the last 30 days',
  all: 'all indexed history',
};

// All time is the default: the windowed views already live on the dashboard
// table, while this page is the only place the full history is visible.
const DEFAULT_RANGE: BackendUsersRange = 'all';

function isUsersRange(value: string | null): value is BackendUsersRange {
  return RANGE_OPTIONS.some((option) => option.value === value);
}

// On phones only rank, user, count, and share fit; spend and last activity
// join at md, where the row has room for six columns. The count column gets
// the widest phone share so an eight-digit all-time count never spills into
// its neighbor.
const COLUMN_WIDTHS: Record<string, string> = {
  rank: 'w-[9%] md:w-[7%]',
  name: 'w-[43%] md:w-[26%]',
  dataCount: 'w-[27%] md:w-[13%]',
  percentage: 'w-[21%] md:w-[26%]',
  totalCost: 'hidden md:table-cell md:w-[15%]',
  lastActive: 'hidden md:table-cell md:w-[13%]',
};
// Overrides the table primitives' px-6, which is too wide for phone columns.
const CELL_PADDING = 'px-2 sm:px-6';
const EMPTY_USERS: User[] = [];

const WEI_PER_ETH = BigInt('1000000000000000000');

/**
 * Total cost as wei for sorting. Prefers the exact wei string; the ETH
 * decimal fallback is parsed to wei rather than floated so near-equal spends
 * still order correctly.
 */
function totalCostWeiValue(user: User): bigint {
  if (user.totalCostWei && /^\d+$/.test(user.totalCostWei)) {
    return BigInt(user.totalCostWei);
  }
  const [whole = '', fraction = ''] = user.totalCostEth.split('.');
  if (!/^\d*$/.test(whole) || !/^\d*$/.test(fraction)) return BigInt(0);
  return (
    BigInt(whole || '0') * WEI_PER_ETH +
    BigInt(fraction.slice(0, 18).padEnd(18, '0') || '0')
  );
}

function compareBigint(a: bigint, b: bigint): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

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

function UserIdentity({ user }: { user: User }) {
  return (
    <div className="flex min-w-0 items-center">
      <AttributionBadge
        user={user.name}
        sizeClass="h-5 w-5"
        className="mr-3"
        textClass="text-[10px]"
      />
      <span className="truncate">{user.name}</span>
    </div>
  );
}

function LeaderboardInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedNetwork } = useNetwork();

  // The URL is the only range state: pills rewrite ?range=, so the address
  // bar always states the view on screen, a shared link opens on the window
  // it was captured at, and back/forward restore the range they left.
  const rangeParam = searchParams.get('range');
  const range: BackendUsersRange = isUsersRange(rangeParam) ? rangeParam : DEFAULT_RANGE;

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'dataCount', desc: true },
  ]);

  const { data: displayData, isLoading, error } = useApiData(
    () => api.getTopUsers(USERS_LEADERBOARD_LIMIT, selectedNetwork.apiParam, range),
    ['top-users', selectedNetwork.apiParam, USERS_LEADERBOARD_LIMIT, range],
    { refetchInterval: REFRESH_INTERVAL_MS }
  );
  const tableData = displayData?.data ?? EMPTY_USERS;

  const handleRangeChange = (next: BackendUsersRange) => {
    if (next === range) return;
    trackEvent('time-range-change', { range: next, previous: range });
    // Replace rather than push: a filter change is not a navigation worth a
    // history entry. Unrelated query params survive the rewrite.
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const userColors = React.useMemo(
    () => assignSeriesColors(tableData.map(userColorInput)),
    [tableData]
  );

  // The server orders by blob count in the window, and transformUserResponses
  // numbers rows in that order, so id is the rank and stays attached to its
  // row through client-side re-sorts.
  const columns = React.useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: 'rank',
        accessorKey: 'id',
        header: () => <span aria-label="Rank">#</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums text-[#8a93a5]">{row.original.id}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <SortableHeader column={column}>User</SortableHeader>
        ),
        cell: ({ row }) => <UserIdentity user={row.original} />,
      },
      {
        accessorKey: 'dataCount',
        header: ({ column }) => (
          <SortableHeader column={column}>Blobs</SortableHeader>
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatNumber(row.original.dataCount)}</span>
        ),
      },
      {
        accessorKey: 'percentage',
        header: ({ column }) => (
          <div className="flex items-center gap-1">
            <SortableHeader column={column}>
              <span className="sm:hidden">%</span>
              <span className="hidden sm:inline">Share</span>
            </SortableHeader>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="hidden rounded-sm text-[#6e7787] hover:text-bodyText focus:outline-none focus:ring-2 focus:ring-blue sm:inline-flex"
                  aria-label="How share is measured"
                >
                  <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {displayData?.hasServerShares
                  ? `Share of all blobs posted in ${RANGE_DESCRIPTIONS[range]}`
                  : `Share of the ${tableData.length} users listed`}
              </TooltipContent>
            </Tooltip>
          </div>
        ),
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="flex items-center">
              {/* min-w, not w: every real share reserves the same 56px so the
                  bars line up, but an out-of-range value from the API widens
                  its own cell instead of overlapping the bar. */}
              <span className="mr-3 shrink-0 tabular-nums sm:min-w-14">{user.percentage}%</span>
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
      {
        id: 'totalCost',
        accessorFn: (user) => user.totalCostWei ?? user.totalCostEth,
        header: ({ column }) => (
          <SortableHeader column={column}>Total Cost</SortableHeader>
        ),
        sortingFn: (a, b) =>
          compareBigint(totalCostWeiValue(a.original), totalCostWeiValue(b.original)),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatCostEthOrWei(row.original.totalCostWei || row.original.totalCostEth)}
          </span>
        ),
      },
      {
        id: 'lastActive',
        accessorFn: (user) => Date.parse(user.lastTimestamp) || 0,
        header: ({ column }) => (
          <SortableHeader column={column}>Last Active</SortableHeader>
        ),
        cell: ({ row }) => <RelativeTime timestamp={row.original.lastTimestamp} />,
      },
    ],
    [displayData?.hasServerShares, range, tableData.length, userColors]
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
      router.push(networkPath(`/user/${address}`, selectedNetwork.apiParam));
    },
    [router, selectedNetwork.apiParam]
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
            <TableHead className={`${CELL_PADDING} ${COLUMN_WIDTHS.rank}`}>#</TableHead>
            <TableHead className={`${CELL_PADDING} ${COLUMN_WIDTHS.name}`}>User</TableHead>
            <TableHead className={`whitespace-nowrap ${CELL_PADDING} ${COLUMN_WIDTHS.dataCount}`}>
              Blobs
            </TableHead>
            <TableHead className={`${CELL_PADDING} ${COLUMN_WIDTHS.percentage}`}>Share</TableHead>
            <TableHead className={`whitespace-nowrap ${CELL_PADDING} ${COLUMN_WIDTHS.totalCost}`}>
              Total Cost
            </TableHead>
            <TableHead className={`whitespace-nowrap ${CELL_PADDING} ${COLUMN_WIDTHS.lastActive}`}>
              Last Active
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
                  <Skeleton className="mr-3 h-5 w-12 shrink-0 sm:w-14" />
                  <div className="hidden h-2.5 w-32 rounded-full bg-[#2a2f37] sm:block">
                    <Skeleton className="h-2.5 w-3/5 rounded-full" />
                  </div>
                </div>
              </TableCell>
              <TableCell className={`${CELL_PADDING} hidden md:table-cell`}>
                <Skeleton className="h-5 w-20" />
              </TableCell>
              <TableCell className={`${CELL_PADDING} hidden md:table-cell`}>
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
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleRangeChange(option.value)}
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
              <TableBody className="divide-y divide-divider">
                {tableData.length === 0 && (
                  <TableRow className="bg-gradient-to-r from-[#17181b] to-[#141519]/60">
                    <TableCell
                      colSpan={columns.length}
                      className={`${CELL_PADDING} py-8 text-center text-sm text-[#6c727f]`}
                    >
                      No blob activity in this window.
                    </TableCell>
                  </TableRow>
                )}
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.original.address}
                    className="cursor-pointer bg-gradient-to-r from-[#17181b] to-[#141519]/60 hover:bg-gradient-to-r hover:from-[#1f2127]/70 hover:to-[#23252b]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-inset"
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
    </div>
  );
}

/**
 * Full blob users leaderboard: the dashboard's top-10 table expanded to the
 * top 50, with rank, total spend, last activity, and the all-time window the
 * backend supports but the dashboard never shows.
 *
 * The Suspense boundary is required: the inner component reads
 * useSearchParams for the ?range= deep link, which opts its subtree into
 * client rendering on the statically prerendered page.
 */
export default function UsersLeaderboard() {
  return (
    <Suspense fallback={null}>
      <LeaderboardInner />
    </Suspense>
  );
}
