import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { isUuid } from '@shared/uuid';
import { NotFoundPage } from '../layout';
import { ThreadMessages } from '../messages/ThreadMessages';
import { sessionQueryOptions } from '../api/session';

// §6.5: one peer's page at `/messages/$peerId`, keyed per peer so no state
// of one (an unsent draft among it) carries into another's (§4.6).
export function ThreadPage(): React.JSX.Element {
  const { peerId } = useParams({ from: '/messages/$peerId' });
  const session = useQuery(sessionQueryOptions());
  const viewerId = session.data?.authenticated === true ? session.data.student.id : '';
  // The shape the API's ParseUUIDPipe accepts (§6.0.1). A malformed id is
  // known here, so no request is sent for it and the console stays clean
  // (§3.5.2, §3.8.2).
  if (!isUuid(peerId)) return <NotFoundPage />;
  // Every id the server issues comes back lower case — the `dm:message`
  // payloads, the send's ack, the rows of the lists — and §6.0.1's pipe
  // passes an upper-case spelling of the same UUID through. The page keys,
  // reads and marks in that lower case, so the one spelling of a peer has
  // the one query key and its open-page check: an upper-case URL would
  // otherwise put the pair's messages under a key the events never target,
  // and the events would be counted unread instead of marked.
  const lowerPeerId = peerId.toLowerCase();
  return <ThreadMessages key={`${viewerId}:${lowerPeerId}`} peerId={lowerPeerId} />;
}
