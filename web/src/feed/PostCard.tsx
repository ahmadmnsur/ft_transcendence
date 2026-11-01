import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { ApiRefusalError } from '../api/client';
import { likersQueryOptions, setLike, type PostView } from '../api/feed';
import type { StudentRef } from '../api/profile';
import { Button, HeartIcon, Modal } from '../design';
import { useI18n } from '../i18n/context';
import { ReportControl } from '../moderation/ReportControl';
import { failureCode } from '../profile/failure';
import { StudentLink } from '../profile/StudentLink';

function LikersDialog({
  likers,
  open,
  onClose,
}: {
  likers: UseQueryResult<{ items: StudentRef[] }>;
  open: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const { t, errorText } = useI18n();
  const copy = t.feed.likers;
  return (
    <Modal open={open} title={copy.title} onClose={onClose} size="sm">
      {likers.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-ink-danger">{errorText(failureCode(likers.error))}</p>
          {likers.error instanceof ApiRefusalError ? null : (
            <Button variant="secondary" size="sm" onClick={() => void likers.refetch()}>
              {copy.retry}
            </Button>
          )}
        </div>
      ) : likers.data === undefined ? (
        <p aria-busy="true" className="text-sm text-ink-muted">{copy.loading}</p>
      ) : likers.data.items.length === 0 ? (
        <p className="text-sm text-ink-muted">{copy.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {likers.data.items.map((student) => (
            <li key={student.id} className="min-w-0">
              <StudentLink student={student} />
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function LikeControls({ post }: { post: PostView }): React.JSX.Element {
  const { t, formatText, errorText } = useI18n();
  const copy = t.feed.post;
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<{ code: unknown } | undefined>(undefined);
  const [likersOpen, setLikersOpen] = useState(false);
  const likers = useQuery({ ...likersQueryOptions(post.id), enabled: likersOpen });
  const likeRef = useRef<HTMLButtonElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const wasOpen = useRef(false);
  const wasUnavailable = useRef(false);
  const unavailable = failure?.code === 'post_unavailable' || failureCode(likers.error) === 'post_unavailable';
  const count = formatText(copy.likeCount, { count: post.likeCount });

  useEffect(() => {
    const closed = wasOpen.current && !likersOpen;
    const replaced = unavailable && !wasUnavailable.current;
    wasOpen.current = likersOpen;
    wasUnavailable.current = unavailable;
    if (likersOpen || !(closed || replaced)) return;
    if (document.activeElement === null || document.activeElement === document.body) {
      (likeRef.current ?? noticeRef.current)?.focus();
    }
  }, [likersOpen, unavailable]);

  async function toggle(): Promise<void> {
    if (pending) return;
    setPending(true);
    setFailure(undefined);
    try {
      await setLike(queryClient, post.id, !post.likedByMe);
    } catch (error) {
      setFailure({ code: failureCode(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {unavailable ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <Button ref={likeRef} variant="secondary" size="sm" aria-pressed={post.likedByMe} loading={pending} onClick={() => void toggle()}>
            <HeartIcon filled={post.likedByMe} className={`me-1.5 inline-block align-text-bottom ${post.likedByMe ? 'text-primary-600 dark:text-ink-accent' : ''}`} />
            {copy.like}
          </Button>
          {post.likeCount === 0 ? (
            <span className="text-sm text-ink-muted">{count}</span>
          ) : (
            <Button variant="ghost" size="sm" aria-haspopup="dialog" onClick={() => setLikersOpen(true)}>
              {count}
            </Button>
          )}
        </div>
      )}
      {unavailable || failure !== undefined ? (
        <p ref={noticeRef} tabIndex={-1} role="alert" className="rounded text-sm text-ink-danger focus-ring">
          {errorText(unavailable ? 'post_unavailable' : failure?.code)}
        </p>
      ) : null}
      <LikersDialog likers={likers} open={likersOpen} onClose={() => setLikersOpen(false)} />
    </div>
  );
}

export function PostCard({ post, showPrompt = true }: { post: PostView; showPrompt?: boolean }): React.JSX.Element {
  const { t, format, formatDateTime } = useI18n();
  const copy = t.feed.post;
  return (
    <article className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <StudentLink student={post.author} />
        <time dateTime={post.createdAt} className="text-sm text-ink-muted">
          {formatDateTime(new Date(post.createdAt))}
        </time>
      </div>
      {post.origin === 'TAKEAWAY' ? (
        <p className="text-sm text-ink-muted">{copy.takeaway}</p>
      ) : showPrompt ? (
        <p className="text-sm text-ink-muted wrap-anywhere">
          {format(copy.answer, {
            question: (
              <Link
                to="/prompts/$promptId"
                params={{ promptId: post.prompt.id }}
                className="rounded text-link underline underline-offset-2 focus-ring"
              >
                <bdi dir="auto">{post.prompt.question}</bdi>
              </Link>
            ),
          })}
        </p>
      ) : null}
      <p dir="auto" className="whitespace-pre-wrap text-ink wrap-anywhere">
        {post.body}
      </p>
      <div className="flex items-start justify-between gap-2">
        <LikeControls post={post} />
        <ReportControl target={{ postId: post.id }} student={post.author} />
      </div>
    </article>
  );
}
