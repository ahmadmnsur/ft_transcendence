import { Link } from '@tanstack/react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { threadsQueryOptions } from '../api/messages';
import { sessionQueryOptions } from '../api/session';
import { AlertIcon, Avatar, Button, Card, EmptyState, MessageIcon, PersonName, RoleLabel } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';

export function ThreadsCard(): React.JSX.Element {
  const { t, formatText, formatDateTime, errorText } = useI18n();
  const copy = t.messages.list;
  const actions = t.social.actions;
  const session = useQuery(sessionQueryOptions());
  const viewerId = session.data?.authenticated === true ? session.data.student.id : null;
  const threads = useInfiniteQuery(threadsQueryOptions());

  let body: React.ReactNode;
  if (threads.data === undefined) {
    body = threads.isError ? (
      <EmptyState
        icon={<AlertIcon size={24} />}
        title={errorText(failureCode(threads.error))}
        action={
          <Button variant="secondary" onClick={() => void threads.refetch()}>
            {actions.retry}
          </Button>
        }
      />
    ) : (
      <p aria-busy="true" className="text-sm text-ink-muted">
        {copy.loading}
      </p>
    );
  } else {
    const rows = threads.data.pages.flatMap((page) => page.items);
    if (rows.length === 0) {
      body = (
        <EmptyState
          icon={<MessageIcon size={24} />}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
        />
      );
    } else {
      body = (
        <>
          <ul className="flex min-w-0 flex-col divide-y divide-line">
            {rows.map((row) => {
              const own = row.lastMessage.senderId === viewerId;
              return (
                <li key={row.peer.id} className="min-w-0">
                  <Link
                    to="/messages/$peerId"
                    params={{ peerId: row.peer.id }}
                    className="flex min-w-0 flex-col gap-1 rounded-lg py-3 focus-ring"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar src={row.peer.removed ? null : row.peer.avatarUrl} alt="" size="xs" />
                      <PersonName
                        name={row.peer.displayName}
                        removed={row.peer.removed}
                        className="min-w-0 truncate font-medium text-link"
                      />
                      {row.peer.isAdmin && !row.peer.removed ? <RoleLabel /> : null}
                      {row.unreadCount > 0 ? (
                        <span className="ms-auto shrink-0 text-sm text-ink">
                          {formatText(copy.unread, { count: row.unreadCount })}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex min-w-0 items-baseline justify-between gap-3">
                      <span dir="auto" className="min-w-0 truncate text-sm text-ink-muted">
                        {own ? formatText(copy.yourMessage, { body: row.lastMessage.body }) : row.lastMessage.body}
                      </span>
                      <span className="shrink-0 text-xs text-ink-subtle">
                        {formatDateTime(new Date(row.lastMessage.createdAt))}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {threads.hasNextPage ? (
            <div className="pt-3">
              <Button
                variant="secondary"
                loading={threads.isFetchingNextPage}
                onClick={() => void threads.fetchNextPage()}
              >
                {copy.showMore}
              </Button>
            </div>
          ) : null}
        </>
      );
    }
  }

  return (
    <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
      {body}
    </Card>
  );
}
