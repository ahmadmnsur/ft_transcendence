import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { countPages, type PageCountProps } from './pages';

export type PaginationProps = PageCountProps & {
  page: number;
  onPageChange: (page: number) => void;
  // Names the navigation landmark; give each Pagination on a page its own.
  label?: string;
  className?: string;
};

function pageItems(page: number, count: number): Array<number | 'gap'> {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const keep = new Set<number>([1, 2, page - 1, page, page + 1, count - 1, count]);
  const sorted = [...keep].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];
  let previous = 0;
  for (const n of sorted) {
    // A gap that would hide a single page shows that page instead.
    if (n - previous === 2) out.push(previous + 1);
    else if (n - previous > 2) out.push('gap');
    out.push(n);
    previous = n;
  }
  return out;
}

const numberClass = (active: boolean): string =>
  [
    'relative inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors duration-150 focus-ring pointer-coarse:min-w-11',
    'pointer-coarse:before:absolute pointer-coarse:before:inset-x-0 pointer-coarse:before:-inset-y-1',
    active ? 'bg-primary-600 text-white' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
  ].join(' ');

export function Pagination(props: PaginationProps): React.JSX.Element {
  const { page, onPageChange, label = 'Pagination', className = '' } = props;
  const count = countPages(props);
  // A page that does not exist is shown as the nearest real one, but the
  // caller is not told: before its total arrives every page looks out of
  // range, and a page read from the URL would be lost. The caller, which knows
  // when its total is real, corrects the page itself, as DataTable does.
  const safePage = Number.isFinite(page) ? Math.min(Math.max(Math.floor(page), 1), count) : 1;
  const items = pageItems(safePage, count);

  function go(next: number): void {
    const clamped = Math.min(Math.max(next, 1), count);
    if (clamped !== safePage) onPageChange(clamped);
  }

  const stepClass =
    'relative inline-flex h-9 items-center justify-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-muted pointer-coarse:min-w-11 transition-colors duration-150 hover:bg-surface-muted hover:text-ink focus-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent pointer-coarse:before:absolute pointer-coarse:before:inset-x-0 pointer-coarse:before:-inset-y-1';

  return (
    <nav aria-label={label} className={`flex min-w-0 flex-wrap items-center justify-center gap-1 ${className}`.trim()}>
      <button type="button" onClick={() => go(safePage - 1)} disabled={safePage <= 1} aria-label="Go to previous page" className={stepClass}>
        <ChevronLeftIcon size={16} />
        <span className="hidden sm:inline">Previous</span>
      </button>
      <p className="px-1 text-sm tabular-nums text-ink-muted sm:hidden">
        Page {safePage} of {count}
      </p>
      <div className="hidden items-center gap-1 sm:flex">
        {items.map((item, index) =>
          item === 'gap' ? (
            <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-sm text-ink-subtle">
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
