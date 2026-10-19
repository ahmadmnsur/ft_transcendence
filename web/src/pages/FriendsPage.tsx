import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { BlocksCard } from '../social/BlocksCard';
import { FriendRequestsCard } from '../social/FriendRequestsCard';
import { FriendsCard } from '../social/FriendsCard';

// §3.5.1: `/friends`, the signed-in Student's own page: their Friends with
// Presence, their incoming and outgoing friend requests, and their Blocks.
export function FriendsPage(): React.JSX.Element {
  const { t } = useI18n();
  const copy = t.social.friends;
  return (
    <>
      <PageTitle name={copy.title} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold text-ink">{copy.title}</h1>
        <FriendsCard />
        <FriendRequestsCard />
        <BlocksCard />
      </div>
    </>
  );
}
