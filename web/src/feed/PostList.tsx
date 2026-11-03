import { useEffect, useRef, type ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { POSTS_PAGE_SIZE, type PostPage } from '../api/feed';
import { AlertIcon, Button, EmptyState, Pagination } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { useRetainedItems } from '../shell/useRetainedItems';
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
  const listRef = useRef<HTMLDivElement>(null);
  const { items, retain, retaining } = useRetainedItems(query.data?.items ?? [], (post) => post.id);
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / POSTS_PAGE_SIZE));
  const settled = query.isSuccess && !query.isPlaceholderData && query.fetchStatus === 'idle';
  useEffect(() => {
    if (settled && !retaining && page > pages) onPageChange(pages, true);
  }, [settled, retaining, page, pages, onPageChange]);

  if (query.data === undefined && items.length === 0) {
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

  if (query.data?.total === 0 && items.length === 0) return <div ref={listRef} tabIndex={-1} className="rounded focus-ring">{empty}</div>;

  return (
    <div ref={listRef} tabIndex={-1} className="flex min-w-0 flex-col gap-4 rounded focus-ring">
      <ul aria-busy={query.isPlaceholderData || undefined} className="flex min-w-0 flex-col divide-y divide-line">
        {items.map((post) => (
          <li key={post.id} className="min-w-0 py-4 first:pt-0">
            <PostCard post={post} showPrompt={showPrompt} onDialogChange={(open) => {
              retain(post, open);
              if (!open && !query.data?.items.some((item) => item.id === post.id)) {
                requestAnimationFrame(() => {
                  if (document.activeElement === document.body) {
                    (listRef.current ?? document.getElementById('main-content'))?.focus();
                  }
                });
              }
            }} />
          </li>
        ))}
      </ul>
      {pages > 1 ? (
        <Pagination
          page={page}
          total={query.data?.total ?? 0}
          pageSize={POSTS_PAGE_SIZE}
          label={label}
          onPageChange={(next) => onPageChange(next, false)}
        />
      ) : null}
    </div>
  );
}
