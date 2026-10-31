export interface PageSearch {
  page?: number;
}

export function parsePageSearch(search: Record<string, unknown>): PageSearch {
  const page = search.page;
  return { page: typeof page === 'number' && Number.isSafeInteger(page) && page > 1 ? page : undefined };
}
