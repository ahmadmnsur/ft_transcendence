import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { SearchIcon } from '../icons/SearchIcon';
import { SortAscIcon } from '../icons/SortAscIcon';
import { SortDescIcon } from '../icons/SortDescIcon';
import { SortIcon } from '../icons/SortIcon';
import { EmptyState } from './EmptyState';
import { Pagination } from './Pagination';

export interface DataTableProps<TData> {
  data: TData[];
  // `any` per column: column helpers type each column by its own value,
  // so a single shared value type rejects their output.
  columns: Array<ColumnDef<TData, any>>;
  getRowId: (row: TData) => string;
  total: number;
  page: number;
  pageSize: number;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  onPageChange: (page: number) => void;
  caption: string;
  emptyTitle?: string;
  emptyDescription?: string;
  loading?: boolean;
}

export function DataTable<TData>({
  data,
  columns,
  getRowId,
  total,
  page,
  pageSize,
  sorting,
  onSortingChange,
  onPageChange,
  caption,
  emptyTitle = 'No rows found',
  emptyDescription,
  loading = false,
}: DataTableProps<TData>): React.JSX.Element {
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortingChange(next);
    },
  });

  const shown = data.length > 0 || loading;

  return (
    <div className="min-w-0">
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table aria-busy={loading || undefined} className="w-full min-w-max border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-neutral-200 bg-neutral-50">
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const sortable = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                      className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-700"
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={() => header.column.toggleSorting(sorted === 'asc')}
                          className="inline-flex items-center gap-1 rounded transition-colors duration-150 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span aria-hidden="true" className="text-neutral-600">
                            {sorted === 'asc' ? <SortAscIcon size={14} /> : sorted === 'desc' ? <SortDescIcon size={14} /> : <SortIcon size={14} />}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading
              ? [0, 1, 2].map((row) => (
                  <tr key={row} aria-hidden="true" className="animate-pulse border-b border-neutral-200 last:border-0">
                    {columns.map((_, cell) => (
                      <td key={cell} className="px-3 py-3">
                        <div className="h-3 w-24 rounded bg-neutral-200" />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-200 transition-colors duration-150 last:border-0 hover:bg-neutral-50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="whitespace-nowrap px-3 py-2.5 text-neutral-800 tabular-nums">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
        {!shown ? (
          <EmptyState
            icon={<SearchIcon size={24} />}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : null}
      </div>
      {pageCount > 1 ? (
        <div className="mt-3">
          <Pagination page={page} pageCount={pageCount} onPageChange={onPageChange} />
        </div>
      ) : null}
    </div>
  );
}
