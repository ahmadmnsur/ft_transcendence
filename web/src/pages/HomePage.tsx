import { useInfiniteQuery } from '@tanstack/react-query';
import { feedQueryOptions } from '../api/feed';
import { EmptyState, MessageIcon } from '../design';
import { PostList } from '../feed/PostList';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';

// §3.5.1, §6.9: `/`, the feed. Every non-removed Post, newest first, with its
// Likes. A new Post joins the loaded feed, at the top, when
// `post:created` arrives (`feed/FeedUpdates.tsx`).
export function HomePage(): React.JSX.Element {
  const { t } = useI18n();
  const copy = t.feed;
  const feed = useInfiniteQuery(feedQueryOptions());
  return (
    <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-6">
      <PageTitle name={copy.title} />
      <h1 className="text-2xl font-semibold text-ink">{copy.title}</h1>
      <PostList
        query={feed}
        empty={<EmptyState icon={<MessageIcon size={24} />} title={copy.emptyTitle} description={copy.emptyDescription} />}
      />
    </div>
  );
}
