import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { feedQueryOptions } from '../api/feed';
import { EmptyState, MessageIcon } from '../design';
import { PostList } from '../feed/PostList';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';

// §3.5.1, §6.9: `/`, the feed. Every non-removed Post, newest first, with its
// Likes, 20 a page (§6.0.1). A new Post joins page 1, at the top, when
// `post:created` arrives (`feed/FeedUpdates.tsx`, §7.4).
export function HomePage(): React.JSX.Element {
  const { t } = useI18n();
  const copy = t.feed;
  const { page: requestedPage } = useSearch({ from: '/' });
  const navigate = useNavigate({ from: '/' });
  const page = requestedPage ?? 1;
  const feed = useQuery(feedQueryOptions(page));
  return (
    <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-6">
      <PageTitle name={copy.title} />
      <h1 className="text-2xl font-semibold text-ink">{copy.title}</h1>
      <PostList
        query={feed}
        page={page}
        onPageChange={(next, replace) => void navigate({ search: { page: next > 1 ? next : undefined }, replace })}
        label={copy.pages}
        empty={<EmptyState icon={<MessageIcon size={24} />} title={copy.emptyTitle} description={copy.emptyDescription} />}
      />
    </div>
  );
}
