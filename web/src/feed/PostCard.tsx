import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { likersQueryOptions, setLike, type PostView } from '../api/feed';
import { Button, HeartIcon, Modal } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { StudentLink } from '../profile/StudentLink';

// §6.9: who liked a Post, read when the dialog opens. A Post removed since the
// page loaded answers `post_unavailable`, shown here like any failure.
function LikersDialog({ postId, open, onClose }: { postId: string; open: boolean; onClose: () => void }): React.JSX.Element {
  const { t, errorText } = useI18n();
  const copy = t.feed.likers;
  const likers = useQuery({ ...likersQueryOptions(postId), enabled: open });
  return (
    <Modal open={open} title={copy.title} onClose={onClose} size="sm">
      {likers.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-ink-danger">{errorText(failureCode(likers.error))}</p>
          <Button variant="secondary" size="sm" onClick={() => void likers.refetch()}>
            {copy.retry}
          </Button>
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

// §6.9, §11.5: the Like toggle and the count, which opens the likers. A Like
// of one's own Post is allowed. The count and the toggle come from the
// server's answer, never guessed ahead of it.
function LikeControls({ post }: { post: PostView }): React.JSX.Element {
  const { t, formatText, errorText } = useI18n();
  const copy = t.feed.post;
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<{ code: unknown } | undefined>(undefined);
  const [likersOpen, setLikersOpen] = useState(false);
  const count = formatText(copy.likeCount, { count: post.likeCount });

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
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" aria-pressed={post.likedByMe} loading={pending} onClick={() => void toggle()}>
          <HeartIcon filled={post.likedByMe} className={`me-1.5 inline-block align-text-bottom ${post.likedByMe ? 'text-primary-600' : ''}`} />
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
      {failure !== undefined ? (
        <p role="alert" className="text-sm text-ink-danger">
          {errorText(failure.code)}
        </p>
      ) : null}
      <LikersDialog postId={post.id} open={likersOpen} onClose={() => setLikersOpen(false)} />
    </div>
  );
}

// One Post (§6.9): its author, where it came from, its text and when it was
// published, then its Likes. A Takeaway names no Mentor (ADR-0018 d4). A
// Prompt's own page leaves its question out with `showPrompt`.
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
      {post.prompt === undefined ? (
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
      <LikeControls post={post} />
    </article>
  );
}
