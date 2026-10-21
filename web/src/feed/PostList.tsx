import type { ReactNode } from 'react';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import type { PostPage } from '../api/feed';
import { AlertIcon, Button, EmptyState } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { PostCard } from './PostCard';

// A stream of Posts, newest first (§6.0.1): the feed and a profile's Posts.
// A failed first page offers a retry; a failed later page keeps the Posts
// already shown and retries that page alone.
export function PostList({
  query,
  empty,
}: {
  query: UseInfiniteQueryResult<InfiniteData<PostPage>>;
  // Shown when there is no Post at all.
  empty: ReactNode;
}): React.JSX.Element {
  const { t, errorText } = useI18n();
  const copy = t.feed;

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

  const posts = query.data.pages.flatMap((page) => page.items);
  if (posts.length === 0) return <>{empty}</>;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ul className="flex min-w-0 flex-col divide-y divide-line">
        {posts.map((post) => (
          <li key={post.id} className="min-w-0 py-4 first:pt-0">
            <PostCard post={post} />
          </li>
        ))}
      </ul>
      {query.isFetchNextPageError ? (
        <p role="alert" className="text-sm text-ink-danger">
          {errorText(failureCode(query.error))}
        </p>
      ) : null}
      {query.hasNextPage ? (
        <div>
          <Button variant="secondary" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
            {query.isFetchNextPageError ? copy.retry : copy.more}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
