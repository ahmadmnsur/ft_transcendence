import { Link } from '@tanstack/react-router';
import type { GroupTarget, QueueReport } from '../api/moderation';
import { useI18n } from '../i18n/context';
import { StudentLink } from '../profile/StudentLink';

export function ReportedTarget({ target, admin }: { target: GroupTarget; admin: boolean }): React.JSX.Element {
  const { t, format, formatDateTime } = useI18n();
  if (target.kind === 'STUDENT') {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <StudentLink student={target.student} />
        {admin ? (
          <Link
            to="/admin/users/$studentId"
            params={{ studentId: target.student.id }}
            className="rounded text-sm text-link underline underline-offset-2 focus-ring"
          >
            {t.moderation.queue.openInUsers}
          </Link>
        ) : null}
      </div>
    );
  }
  const { post } = target;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <StudentLink student={post.author} />
        <time dateTime={post.createdAt} className="text-sm text-ink-muted">
          {formatDateTime(new Date(post.createdAt))}
        </time>
      </div>
      {post.origin === 'TAKEAWAY' ? (
        <p className="text-sm text-ink-muted">{t.feed.post.takeaway}</p>
      ) : (
        <p className="text-sm text-ink-muted wrap-anywhere">
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
        </p>
      )}
      <p dir="auto" className="whitespace-pre-wrap text-ink wrap-anywhere">
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
        <li key={index} className="flex min-w-0 flex-col gap-1 py-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-medium text-ink">{t.reports.reasons[report.reason]}</span>
            <span className="text-sm text-ink-muted">
              {format(copy.report.filedAt, {
                time: <time dateTime={report.createdAt}>{formatDateTime(new Date(report.createdAt))}</time>,
              })}
            </span>
          </div>
          {report.reporter !== undefined ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              {format(copy.report.filedBy, { name: <StudentLink student={report.reporter} /> })}
            </div>
          ) : null}
          {report.text === null ? (
            <p className="text-sm text-ink-muted">{copy.report.noText}</p>
          ) : (
            <p dir="auto" className="whitespace-pre-wrap text-sm text-ink wrap-anywhere">
              {report.text}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
