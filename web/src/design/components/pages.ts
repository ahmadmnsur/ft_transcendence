export type PageCountProps = { pageCount: number; total?: never; pageSize?: never } | { pageCount?: never; total: number; pageSize: number };

export function countPages(props: PageCountProps): number {
  const count = props.pageCount !== undefined ? props.pageCount : Math.ceil(props.total / props.pageSize);
  return Number.isFinite(count) && count >= 1 ? Math.floor(count) : 1;
}
