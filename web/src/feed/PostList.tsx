import { useEffect, type ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { POSTS_PAGE_SIZE, type PostPage } from '../api/feed';
import { AlertIcon, Button, EmptyState, Pagination } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { PostCard } from './PostCard';

// One numbered page of Posts, newest first (§6.0.1): the feed, a profile's
// Posts and a Prompt's answers. The caller keeps the page in the URL as
// `?page=`, so reload, Back and a shared link keep it. A page past the end,
// such as one a moderator's removal emptied, is replaced by the last one. The
// page on screen stays while the next one loads; a failed read with nothing
// on screen offers a retry.
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
  // `replace` is true when the list corrects a page past the end, so Back
  // does not return to it.
  onPageChange: (page: number, replace: boolean) => void;
  // Names the page navigation.
  label: string;
  // Shown when there is no Post at all.
  empty: ReactNode;
  showPrompt?: boolean;
}): React.JSX.Element {
  const { t, errorText } = useI18n();
  const copy = t.feed;
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / POSTS_PAGE_SIZE));
  // Only a finished, successful read of this very page may correct it: a
  // cached copy being read again still holds its old `total`, which may have
  // grown since (a live Post adds to page 1's), and the previous page shown
  // while this one loads is not this page at all.
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
