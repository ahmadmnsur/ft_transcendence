import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { feedQueryOptions } from '../api/feed';
import { sessionQueryOptions } from '../api/session';
import { EmptyState, MessageIcon } from '../design';
import { PostList } from '../feed/PostList';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { LandingPage } from './LandingPage';

export function HomePage(): React.JSX.Element {
  const { data: session } = useQuery(sessionQueryOptions());
  return session?.authenticated === true ? <FeedPage /> : <LandingPage />;
}

function FeedPage(): React.JSX.Element {
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
