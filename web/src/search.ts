export interface PageSearch {
  page?: number;
}

// Drop a page the API would refuse before sending a request (§3.5.2).
export function parsePageSearch(search: Record<string, unknown>): PageSearch {
  const page = search.page;
  return { page: typeof page === 'number' && Number.isSafeInteger(page) && page > 1 ? page : undefined };
}
