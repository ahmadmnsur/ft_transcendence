import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { isUuid } from '@shared/uuid';
import { NotFoundPage } from '../layout';
import { ThreadMessages } from '../messages/ThreadMessages';
import { sessionQueryOptions } from '../api/session';

export function ThreadPage(): React.JSX.Element {
  const { peerId } = useParams({ from: '/messages/$peerId' });
  const session = useQuery(sessionQueryOptions());
  const viewerId = session.data?.authenticated === true ? session.data.student.id : '';
  if (!isUuid(peerId)) return <NotFoundPage />;
  const lowerPeerId = peerId.toLowerCase();
  return <ThreadMessages key={`${viewerId}:${lowerPeerId}`} peerId={lowerPeerId} />;
}
