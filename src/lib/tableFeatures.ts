import {
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
} from '@tanstack/react-table';

/**
 * Feature set shared by the sortable leaderboard tables.
 *
 * TanStack Table 9 only exposes the APIs of the features registered here, so
 * a table built on this set gets column.getIsSorted() and friends plus the
 * client-side sorted row model. The registry holds the built-in sort
 * functions a column may name or that 'auto' may resolve: numeric columns
 * resolve to basic, and the name columns declare alphanumeric explicitly.
 * 'auto' picks between text and alphanumeric by sampling the first ten rows,
 * so leaving a string column on it would make the order depend on which
 * names happen to lead the table.
 */
export const sortableTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    text: sortFn_text,
  },
});

export type SortableTableFeatures = typeof sortableTableFeatures;
