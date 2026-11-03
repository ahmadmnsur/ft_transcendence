import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { isUuid } from '@shared/uuid';
import { ApiProtocolError } from '../api/client';
import { matchQueryOptions } from '../api/matches';
import { AlertIcon, Button, EmptyState } from '../design';
import { useI18n } from '../i18n/context';
import { NotFoundPage, PageTitle } from '../layout';
import { MatchNoticeBanner, type MatchNotice } from '../matching/MatchParts';
import { PairMatchCard } from '../matching/PairMatchCard';
import { failureCode } from '../profile/failure';
import { ReviewRecord } from '../reviews/ReviewRecord';
import { useOpenedPage } from '../newDots/useNewDots';

export function MatchDetailPage(): React.JSX.Element {
  const { t, format, formatText, errorText } = useI18n();
  const copy = t.matching.detail;
  const { matchId } = useParams({ from: '/matches/$matchId' });
  const wellFormedId = isUuid(matchId);
  useOpenedPage('feedback', matchId, wellFormedId);
  const { data, error, isError, refetch } = useQuery({ ...matchQueryOptions(matchId), enabled: wellFormedId });
  const [notice, setNotice] = useState<MatchNotice | undefined>(undefined);

  if (!wellFormedId) return <NotFoundPage />;

  if (data === undefined) {
    if (isError && error instanceof ApiProtocolError && error.status === 404) return <NotFoundPage />;
    return (
      <>
        <PageTitle />
        {isError ? (
          <>
            <h1 className="sr-only">{errorText(failureCode(error))}</h1>
            <EmptyState
              icon={<AlertIcon size={24} />}
              title={errorText(failureCode(error))}
              action={
                <Button variant="secondary" onClick={() => void refetch()}>
                  {t.matching.match.retry}
                </Button>
              }
            />
          </>
        ) : (
          <p aria-busy="true" className="mx-auto w-full max-w-2xl text-sm text-ink-muted">
            {copy.loading}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <PageTitle name={formatText(copy.title, { number: data.roundNumber })} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold text-ink">{format(copy.title, { number: data.roundNumber })}</h1>
        <MatchNoticeBanner notice={notice} />
        <PairMatchCard match={data} onNotice={setNotice} />
        <ReviewRecord
          review={data.review}
          privateFeedback={data.privateFeedback}
          matchId={data.id}
          evidenceEditable={data.myRole === 'MENTEE'}
        />
        <Link to="/matches" className="self-start rounded text-link underline underline-offset-2 focus-ring">
          {copy.historyLink}
        </Link>
      </div>
    </>
  );
}
