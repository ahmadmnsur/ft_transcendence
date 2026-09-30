import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from '@tanstack/react-table';
import { AlertIcon } from '../icons/AlertIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { SortAscIcon } from '../icons/SortAscIcon';
import { SortDescIcon } from '../icons/SortDescIcon';
import { SortIcon } from '../icons/SortIcon';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { countPages } from './pages';
import { Pagination } from './Pagination';

declare module '@tanstack/react-table' {
  // Per-column options DataTable reads from a column's `meta`.
  interface ColumnMeta<TData extends RowData, TValue> {
    // 'end' right-aligns a column, for numbers, so their digits line up.
    align?: 'end';
  }
}

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
  emptyIcon?: ReactNode;
  // A way forward from an empty page, such as a button that clears the filters.
  emptyAction?: ReactNode;
  loading?: boolean;
  // Shown in place of the rows when the page failed to load.
  error?: string;
  // Offered as "Try again" beside the error.
  onRetry?: () => void;
  className?: string;
}

// As many skeleton rows as the page will hold, so the table keeps its height
// when the rows arrive; the rows already shown are the best guess.
function skeletonRowCount(shown: number, pageSize: number): number {
  const expected = shown > 0 ? shown : Number.isFinite(pageSize) ? Math.floor(pageSize) : 1;
  return Math.min(Math.max(expected, 1), 50);
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
  emptyIcon = <SearchIcon size={24} />,
  emptyAction,
  loading = false,
  error,
  onRetry,
  className = '',
}: DataTableProps<TData>): React.JSX.Element {
  const pageCount = countPages({ total, pageSize });
  const frameRef = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const [moreToRight, setMoreToRight] = useState(false);
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    // One sort at a time: the server sorts by a single column.
    enableMultiSort: false,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortingChange(next);
    },
  });

  const failed = Boolean(error) && !loading;
  const validPage = Number.isInteger(page) && page >= 1 && page <= pageCount;
  const nearestPage = Number.isFinite(page) ? Math.min(Math.max(Math.floor(page), 1), pageCount) : 1;
  // While the page is being corrected the rows are not an answer yet, so no
  // "nothing found" is shown or announced.
  const empty = !loading && !failed && validPage && data.length === 0;

  // A page that no longer exists, such as the last page after its last row
  // went away, or a page read from a bad URL, sends the caller to the nearest
  // real one; otherwise the table would sit empty with no pages to go back to.
  // Pagination below gets the corrected page, so the caller is told once.
  const settlePage = useEffectEvent((next: number) => onPageChange(next));
  useEffect(() => {
    if (loading || failed || validPage) return;
    settlePage(nearestPage);
  }, [loading, failed, validPage, nearestPage]);

  // A table wider than its frame scrolls sideways; the frame then takes focus
  // so the keyboard can scroll it too, and a fade on the right edge shows that
  // more columns wait there.
  function measure(): void {
    const frame = frameRef.current;
    if (!frame) return;
    setScrollable(frame.scrollWidth > frame.clientWidth + 1);
    setMoreToRight(frame.scrollLeft + frame.clientWidth < frame.scrollWidth - 1);
  }
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    if (frame.firstElementChild) observer.observe(frame.firstElementChild);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <div className="relative">
        <div
          ref={frameRef}
          role={scrollable ? 'region' : undefined}
          aria-label={scrollable ? caption : undefined}
          tabIndex={scrollable ? 0 : undefined}
          onScroll={measure}
          className="overflow-x-auto rounded-lg border border-line bg-surface focus-ring"
        >
          <table aria-busy={loading || undefined} className="w-full min-w-max border-collapse text-left text-sm">
            <caption className="sr-only">{caption}</caption>
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id} className="border-b border-line bg-canvas">
                  {group.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    const sortable = header.column.getCanSort();
                    const end = header.column.columnDef.meta?.align === 'end';
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                        className={`whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-ink-muted ${sortable ? '' : 'px-3 py-2'} ${end ? 'text-right' : ''}`.trim()}
                      >
                        {header.isPlaceholder ? null : sortable ? (
                          // The button fills the header cell, so the whole cell is the target.
                          // The table's own toggle sorts numbers high to low first and
                          // clears the sort on a third press.
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className={`flex w-full items-center gap-1 px-3 py-2 uppercase transition-colors duration-150 hover:text-ink focus-ring-inset pointer-coarse:py-3 ${end ? 'justify-end' : ''}`.trim()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <span aria-hidden="true" className="text-ink-subtle">
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
                ? Array.from({ length: skeletonRowCount(data.length, pageSize) }, (_, row) => (
                    <tr key={row} aria-hidden="true" className="border-b border-line motion-safe:animate-pulse last:border-0">
                      {columns.map((_, cell) => (
                        <td key={cell} className="px-3 py-3">
                          <div className="h-3 w-24 rounded bg-surface-sunken" />
                        </td>
                      ))}
                    </tr>
                  ))
                : null}
              {!loading && !failed
                ? table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-line transition-colors duration-150 last:border-0 hover:bg-surface-muted">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className={`px-3 py-2.5 text-ink tabular-nums ${cell.column.columnDef.meta?.align === 'end' ? 'text-right' : ''}`.trim()}>
                          {/* Long text, such as an email address, wraps at a set width instead of widening the table. */}
                          <div className="max-w-xs wrap-anywhere">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                        </td>
                      ))}
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
          {/* Both regions are always present, so a failure or a search that comes back empty is announced. */}
          <div role="alert">
            {failed ? (
              <p className="flex items-center justify-center gap-2 px-4 pt-10 text-center text-sm font-medium text-ink-danger">
                <AlertIcon size={18} className="shrink-0" />
                {error}
              </p>
            ) : null}
          </div>
          {failed ? (
            <div className="flex justify-center px-4 pb-10 pt-3">
              {onRetry ? (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  Try again
                </Button>
              ) : null}
            </div>
          ) : null}
          <div role="status">
            {empty ? <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} /> : null}
          </div>
        </div>
        {moreToRight ? (
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-px right-px w-10 rounded-r-lg bg-linear-to-l from-surface" />
        ) : null}
      </div>
      {/* Kept through a failed load, so the user can try another page. */}
      {pageCount > 1 ? (
        <Pagination page={nearestPage} pageCount={pageCount} onPageChange={onPageChange} label={`${caption} pages`} className="mt-3" />
      ) : null}
    </div>
  );
}
