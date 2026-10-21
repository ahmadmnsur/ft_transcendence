import { useEffect } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { PAGING } from '@shared/limits';
import { feedbackQueryOptions } from '../api/reviews';
import { Banner, Button, MessageIcon, Card, EmptyState, Pagination } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { failureCode } from '../profile/failure';
import { StudentLink } from '../profile/StudentLink';
import { FeedbackAnswers } from '../reviews/ReviewRecord';

export function FeedbackPage(): React.JSX.Element {
  const { t, format, formatDate, errorText } = useI18n();
  const { page: requestedPage } = useSearch({ from: '/feedback' });
  const navigate = useNavigate({ from: '/feedback' });
  const page = requestedPage ?? 1;
  const feedback = useQuery(feedbackQueryOptions(page, PAGING.defaultPageSize));
  const pages = Math.max(1, Math.ceil((feedback.data?.total ?? 0) / PAGING.defaultPageSize));
  useEffect(() => {
    if (feedback.data !== undefined && page > pages)
      void navigate({ search: { page: pages > 1 ? pages : undefined }, replace: true });
  }, [feedback.data, page, pages, navigate]);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageTitle name={t.reviews.receivedTitle} />
      <h1 className="text-2xl font-semibold text-ink">{t.reviews.receivedTitle}</h1>
      {feedback.isError ? (
        <>
          <Banner tone="danger" title={errorText(failureCode(feedback.error))} />
          <Button onClick={() => void feedback.refetch()}>{t.reviews.retry}</Button>
        </>
      ) : feedback.data === undefined ? (
        <p aria-busy="true">{t.reviews.loading}</p>
      ) : feedback.data.total === 0 ? (
        <EmptyState icon={<MessageIcon size={24} />} title={t.reviews.receivedEmpty} />
      ) : (
        <>
          {feedback.data.items.map((item) => (
            <Card
              key={item.matchId}
              title={format(t.matching.match.roundNumber, { number: item.roundNumber })}
            >
              <div className="flex min-w-0 flex-col gap-4">
                <StudentLink student={item.author} />
                <time dateTime={item.createdAt} className="text-sm text-ink-muted">
                  {formatDate(new Date(item.createdAt))}
                </time>
                <FeedbackAnswers feedback={item} />
                <Link
                  to="/matches/$matchId"
                  params={{ matchId: item.matchId }}
                  className="self-start rounded text-link underline focus-ring"
                >
                  {t.reviews.back}
                </Link>
              </div>
            </Card>
          ))}
          <Pagination
            page={page}
            total={feedback.data.total}
            pageSize={PAGING.defaultPageSize}
            onPageChange={(next) => void navigate({ search: { page: next > 1 ? next : undefined } })}
          />
        </>
      )}
    </div>
  );
}
