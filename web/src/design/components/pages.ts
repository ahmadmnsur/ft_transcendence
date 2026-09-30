// The page count, given directly or as a total and a page size.
export type PageCountProps = { pageCount: number; total?: never; pageSize?: never } | { pageCount?: never; total: number; pageSize: number };

// At least one page, whatever the numbers: a total over a page size of zero,
// or a count parsed from a bad URL, still gives a usable control.
export function countPages(props: PageCountProps): number {
  const count = props.pageCount !== undefined ? props.pageCount : Math.ceil(props.total / props.pageSize);
  return Number.isFinite(count) && count >= 1 ? Math.floor(count) : 1;
}
