import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { currentMatchQueryOptions, currentRoundQueryOptions } from '../api/matches';
import { AlertIcon, Button, EmptyState, UserIcon } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { MatchNoticeBanner, type MatchNotice } from '../matching/MatchParts';
import { PairMatchCard } from '../matching/PairMatchCard';
import { failureCode } from '../profile/failure';

// §3.5.1: `/match`, the signed-in Student's Match in the open Round — partner,
// role, the Compatibility Score with its explanation, the Mission, accept and
// decline. With no open Round, or no Match in it, it says which. Both reads
// run again whenever the page opens or a Round opens or closes; a ready Match
// refreshes the Match read (§7.4, `matching/RoundUpdates.tsx`). A partner's
// answer still sends no event.
export function MatchPage(): React.JSX.Element {
  const { t, formatText, errorText } = useI18n();
  const copy = t.matching.current;
  const round = useQuery(currentRoundQueryOptions());
  const current = useQuery(currentMatchQueryOptions());
  const [notice, setNotice] = useState<MatchNotice | undefined>(undefined);

  let body: React.ReactNode;
  if (round.data === undefined || current.data === undefined) {
    const failed = round.isError ? round.error : current.isError ? current.error : undefined;
    body =
      failed !== undefined ? (
        <EmptyState
          icon={<AlertIcon size={24} />}
          title={errorText(failureCode(failed))}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                void round.refetch();
                void current.refetch();
              }}
            >
              {t.matching.match.retry}
            </Button>
          }
        />
      ) : (
        <p aria-busy="true" className="text-sm text-ink-muted">
          {copy.loading}
        </p>
      );
  } else if (current.data.match !== null) {
    body = <PairMatchCard match={current.data.match} onNotice={setNotice} />;
  } else if (round.data.round === null) {
    body = <EmptyState icon={<UserIcon size={24} />} title={copy.noRoundTitle} description={copy.noRoundDescription} />;
  } else {
    body = (
      <EmptyState
        icon={<UserIcon size={24} />}
        title={formatText(copy.noMatchTitle, { number: round.data.round.number })}
        description={copy.noMatchDescription}
      />
    );
  }

  return (
    <>
      <PageTitle name={copy.title} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold text-ink">{copy.title}</h1>
        <MatchNoticeBanner notice={notice} />
        {body}
        <Link to="/matches" className="self-start rounded text-link underline underline-offset-2 focus-ring">
          {copy.historyLink}
        </Link>
      </div>
    </>
  );
}
