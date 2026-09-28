import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';

export interface PaginationProps {
  page: number;
  pageCount?: number;
  total?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

function resolvePageCount({ pageCount, total, pageSize }: Pick<PaginationProps, 'pageCount' | 'total' | 'pageSize'>): number {
  if (pageCount !== undefined) return Math.max(pageCount, 1);
  if (total !== undefined && pageSize) return Math.max(Math.ceil(total / pageSize), 1);
  return 1;
}

function pageItems(page: number, count: number): Array<number | 'gap'> {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const keep = new Set<number>([1, 2, page - 1, page, page + 1, count - 1, count]);
  const sorted = [...keep].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];
  let previous = 0;
  for (const n of sorted) {
    if (n - previous > 1) out.push('gap');
    out.push(n);
    previous = n;
  }
  return out;
}

const numberClass = (active: boolean): string =>
  [
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
    active ? 'bg-primary-600 text-white' : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900',
  ].join(' ');

export function Pagination(props: PaginationProps): React.JSX.Element {
  const { page, onPageChange } = props;
  const count = resolvePageCount(props);
  const safePage = Math.min(Math.max(page, 1), count);
  const items = pageItems(safePage, count);

  function go(next: number): void {
    const clamped = Math.min(Math.max(next, 1), count);
    if (clamped !== safePage) onPageChange(clamped);
  }

  const stepClass =
    'inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent';

  return (
    <nav aria-label="Pagination" className="flex min-w-0 flex-wrap items-center justify-center gap-1">
      <button type="button" onClick={() => go(safePage - 1)} disabled={safePage <= 1} aria-label="Go to previous page" className={stepClass}>
        <ChevronLeftIcon size={16} />
        <span className="hidden sm:inline">Previous</span>
      </button>
      <p className="px-1 text-sm tabular-nums text-neutral-700 sm:hidden">
        Page {safePage} of {count}
      </p>
      <div className="hidden items-center gap-1 sm:flex">
        {items.map((item, index) =>
          item === 'gap' ? (
            <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-sm text-neutral-600">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => go(item)}
              aria-label={`Go to page ${item}`}
              aria-current={item === safePage ? 'page' : undefined}
              className={numberClass(item === safePage)}
            >
              {item}
            </button>
          ),
        )}
      </div>
      <button type="button" onClick={() => go(safePage + 1)} disabled={safePage >= count} aria-label="Go to next page" className={stepClass}>
        <span className="hidden sm:inline">Next</span>
        <ChevronRightIcon size={16} />
      </button>
    </nav>
  );
}
