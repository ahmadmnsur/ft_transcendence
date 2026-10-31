import { useEffect, type ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { POSTS_PAGE_SIZE, type PostPage } from '../api/feed';
import { AlertIcon, Button, EmptyState, Pagination } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { PostCard } from './PostCard';

export function PostList({
  query,
  page,
  onPageChange,
  label,
  empty,
  showPrompt,
}: {
  query: UseQueryResult<PostPage>;
  page: number;
  onPageChange: (page: number, replace: boolean) => void;
  label: string;
  empty: ReactNode;
  showPrompt?: boolean;
}): React.JSX.Element {
  const { t, errorText } = useI18n();
  const copy = t.feed;
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / POSTS_PAGE_SIZE));
  const settled = query.isSuccess && !query.isPlaceholderData && query.fetchStatus === 'idle';
  useEffect(() => {
    if (settled && page > pages) onPageChange(pages, true);
  }, [settled, page, pages, onPageChange]);

  if (query.data === undefined) {
    if (query.isError) {
      return (
        <EmptyState
          icon={<AlertIcon size={24} />}
          title={errorText(failureCode(query.error))}
          action={
            <Button variant="secondary" onClick={() => void query.refetch()}>
              {copy.retry}
            </Button>
          }
        />
      );
    }
    return (
      <p aria-busy="true" className="text-sm text-ink-muted">
        {copy.loading}
      </p>
    );
  }

  if (query.data.total === 0) return <>{empty}</>;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ul aria-busy={query.isPlaceholderData || undefined} className="flex min-w-0 flex-col divide-y divide-line">
        {query.data.items.map((post) => (
          <li key={post.id} className="min-w-0 py-4 first:pt-0">
            <PostCard post={post} showPrompt={showPrompt} />
          </li>
        ))}
      </ul>
      {pages > 1 ? (
        <Pagination
          page={page}
          total={query.data.total}
          pageSize={POSTS_PAGE_SIZE}
          label={label}
          onPageChange={(next) => onPageChange(next, false)}
        />
      ) : null}
    </div>
  );
}
