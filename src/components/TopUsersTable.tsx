"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { TopUsersResponse, User } from '../types';
import DataStateWrapper from './DataStateWrapper';
import { useNetwork } from '../hooks/useNetwork';
import { getAttributionImageSrc, getAttributionInitial } from '../utils';
import { useLatestBlobEvent } from '../contexts/LiveDataContext';
import { transformUserResponses } from '../lib/api/users';
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

const COLUMN_WIDTHS: Record<string, string> = {
  name: 'w-1/3',
  dataCount: 'w-1/3',
  percentage: 'w-1/3',
};
const EMPTY_USERS: User[] = [];

function getUserColor(userName: string): string {
  switch (userName.toLowerCase()) {
    case 'arbitrum':
      return 'bg-[#12aaff]';
    case 'optimism':
      return 'bg-[#ff0420]';
    case 'base':
      return 'bg-[#1652f0]';
    case 'zksync':
      return 'bg-[#f2f2f2]';
    default:
      return 'bg-gray-500';
  }
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
  const imageSrc = getAttributionImageSrc(user.name);

  return (
    <div className="flex items-center">
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={user.name}
          width={20}
          height={20}
          className="mr-3 inline-block h-5 w-5"
        />
      ) : (
        <span className="mr-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-500 text-[10px] font-medium text-white">
          {getAttributionInitial(user.name)}
        </span>
      )}
      {user.name}
    </div>
  );
}

export default function TopUsersTable() {
  const router = useRouter();
  const { selectedNetwork } = useNetwork();
  const usersUpdateEvent = useLatestBlobEvent('users_update');
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'dataCount', desc: true },
  ]);

  const { data, isLoading, error } = useApiData<TopUsersResponse>(
    () => api.getTopUsers(10, selectedNetwork.apiParam),
    ['top-users', selectedNetwork.apiParam, 10]
  );
  const displayData = React.useMemo(
    () => (usersUpdateEvent ? transformUserResponses(usersUpdateEvent.data) : data),
    [data, usersUpdateEvent]
  );
  const tableData = displayData?.data ?? EMPTY_USERS;
  const tbodyRef = React.useRef<HTMLTableSectionElement | null>(null);
  useFlipRows(tbodyRef, selectedNetwork.apiParam);

  const columns = React.useMemo<ColumnDef<User>[]>(
    () => [
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
          <div className="flex items-center gap-1">
            <SortableHeader column={column}>Count</SortableHeader>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex rounded-sm text-[#6e7787] hover:text-bodyText focus:outline-none focus:ring-2 focus:ring-blue"
                  aria-label="Recent indexed activity"
                >
                  <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Recent indexed activity</TooltipContent>
            </Tooltip>
          </div>
        ),
        cell: ({ row }) => row.original.dataCount,
      },
      {
        accessorKey: 'percentage',
        header: ({ column }) => (
          <SortableHeader column={column}>% of Total</SortableHeader>
        ),
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="flex items-center">
              <span className="mr-3">{user.percentage}%</span>
              <div className="h-2.5 w-32 rounded-full bg-[#2a2f37]">
                <div
                  className={`h-2.5 rounded-full ${getUserColor(user.name)}`}
                  style={{ width: `${user.percentage}%` }}
                />
              </div>
            </div>
          );
        },
      },
    ],
    []
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
            <TableHead className="w-1/3">User</TableHead>
            <TableHead className="w-1/3 whitespace-nowrap">Count</TableHead>
            <TableHead className="w-1/3">% of Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-divider">
          {[...Array(5)].map((_, index) => (
            <TableRow key={index} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60">
              <TableCell>
                <div className="flex items-center">
                  <Skeleton className="mr-3 h-5 w-5 rounded-full" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-12" />
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Skeleton className="mr-3 h-5 w-12" />
                  <div className="h-2.5 w-32 rounded-full bg-[#2a2f37]">
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
      <h2 className="mb-4 text-2xl font-windsor-bold text-white">Top Blob Users</h2>

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
                          className={COLUMN_WIDTHS[header.column.id]}
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
                    className="cursor-pointer bg-gradient-to-r from-[#161a29] to-[#19191e]/60 hover:bg-gradient-to-r hover:from-[#202538]/70 hover:to-[#242731]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-inset"
                    onClick={() => goToUser(row.original.address)}
                    onKeyDown={(event) => handleRowKeyDown(event, row.original.address)}
                    tabIndex={0}
                    role="link"
                    aria-label={`View activity for ${row.original.name}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={`whitespace-nowrap text-sm text-white ${COLUMN_WIDTHS[cell.column.id]}`}
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
    </section>
  );
}
