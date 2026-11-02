import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import type { GroupTarget, ModeratedPost, QueueReport } from '../api/moderation';
import { useI18n } from '../i18n/context';
import { StudentLink } from '../profile/StudentLink';

export function TargetHeading({ target, id }: { target: GroupTarget; id: string }): React.JSX.Element {
  const { t, format } = useI18n();
  if (target.kind === 'STUDENT') {
    return (
      <span id={id} className="flex min-w-0">
        <span className="sr-only">{t.moderation.queue.studentGroup} </span>
        <StudentLink student={target.student} />
      </span>
    );
  }
  return (
    <span id={id} className="flex min-w-0 flex-wrap items-center gap-x-1.5">
      {format(t.moderation.queue.postBy, { name: <StudentLink student={target.post.author} /> })}
    </span>
  );
}

export function MetaLine({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <span className="-mx-1 block overflow-x-clip px-1">
      <span className="meta-line">{children}</span>
    </span>
  );
}

export function OpenInUsers({
  studentId,
  name,
  describedBy,
}: {
  studentId: string;
  name?: string;
  describedBy?: string;
}): React.JSX.Element {
  const { t, formatText } = useI18n();
  return (
    <Link
      to="/admin/users/$studentId"
      params={{ studentId }}
      aria-describedby={describedBy}
      className="relative inline-block min-w-0 rounded text-sm text-link underline underline-offset-2 wrap-anywhere focus-ring pointer-coarse:before:absolute pointer-coarse:before:inset-x-0 pointer-coarse:before:-inset-y-3"
    >
      {name === undefined ? t.moderation.queue.openInUsers : formatText(t.moderation.queue.openNameInUsers, { name })}
    </Link>
  );
}

export function ReportedTarget({ post }: { post: ModeratedPost }): React.JSX.Element {
  const { t, format, formatDateTime } = useI18n();
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg bg-canvas px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-sm text-ink-muted">
        <MetaLine>
          {post.origin === 'TAKEAWAY' ? (
            <span>{t.feed.post.takeaway}</span>
          ) : (
            <span className="min-w-0 wrap-anywhere">
              {format(t.feed.post.answer, {
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
            </span>
          )}
          <span>
            {format(t.moderation.post.postedAt, {
              time: <time dateTime={post.createdAt}>{formatDateTime(new Date(post.createdAt))}</time>,
            })}
          </span>
        </MetaLine>
      </p>
      <p dir="auto" className="max-w-prose whitespace-pre-wrap text-ink wrap-anywhere text-match-parent">
        {post.body}
      </p>
      {post.removed ? <p className="text-sm font-medium text-ink-danger">{t.moderation.post.removed}</p> : null}
    </div>
  );
}

export function ReportRows({ reports }: { reports: QueueReport[] }): React.JSX.Element {
  const { t, format, formatDateTime } = useI18n();
  const copy = t.moderation;
  return (
    <ul aria-label={copy.queue.reportsLabel} className="flex flex-col divide-y divide-line border-t border-line">
      {reports.map((report, index) => (
        <li key={reports.length - index} className="flex min-w-0 flex-col gap-1 py-3">
          <div className="text-sm">
            <MetaLine>
              <span className="font-semibold text-ink">{t.reports.reasons[report.reason]}</span>
              <span className="text-ink-muted">
                {format(copy.report.filedAt, {
                  time: <time dateTime={report.createdAt}>{formatDateTime(new Date(report.createdAt))}</time>,
                })}
              </span>
            </MetaLine>
          </div>
          {report.reporter !== undefined ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              {format(copy.report.filedBy, { name: <StudentLink student={report.reporter} /> })}
            </div>
          ) : null}
          {report.text === null ? (
            <p className="text-sm text-ink-muted">{copy.report.noText}</p>
          ) : (
            <p dir="auto" className="max-w-prose whitespace-pre-wrap text-sm text-ink wrap-anywhere text-match-parent">
              {report.text}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
