import type { ReactNode } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { isUuid } from '@shared/uuid';
import { ApiProtocolError } from '../api/client';
import { adminMatchQueryOptions } from '../api/matches';
import { AlertIcon, Button, Card, EmptyState, PersonName } from '../design';
import { useI18n } from '../i18n/context';
import { NotFoundPage, PageTitle } from '../layout';
import { MatchStatusLabel, ScoreDetails, endingOf, useSkillList } from '../matching/MatchParts';
import { failureCode } from '../profile/failure';
import { StudentLink } from '../profile/StudentLink';

// §3.5.1, §6.13: `/admin/matches/:matchId`, any Match for an Admin, with both
// participants named — where the pair's own view names one side's partner.
// The explanation is written in the third person from the same frozen
// coverage and goal flag (§8.11). An unknown Match is the not-found state; a
// malformed id is answered without a request (§3.5.2).
export function AdminMatchPage(): React.JSX.Element {
  const { t, format, formatText, errorText } = useI18n();
  const parts = t.matching.match;
  const copy = t.matching.adminMatch;
  const skillList = useSkillList();
  const { matchId } = useParams({ from: '/admin/matches/$matchId' });
  const wellFormedId = isUuid(matchId);
  const { data, error, isError, refetch } = useQuery({ ...adminMatchQueryOptions(matchId), enabled: wellFormedId });

  if (!wellFormedId) return <NotFoundPage />;

  if (data === undefined) {
    if (isError && error instanceof ApiProtocolError && error.status === 404) return <NotFoundPage />;
    return (
      <>
        <PageTitle name={t.matching.rounds.title} />
        {isError ? (
          <>
            <h1 className="sr-only">{errorText(failureCode(error))}</h1>
            <EmptyState
              icon={<AlertIcon size={24} />}
              title={errorText(failureCode(error))}
              action={
                <Button variant="secondary" onClick={() => void refetch()}>
                  {parts.retry}
                </Button>
              }
            />
          </>
        ) : (
          <p aria-busy="true" className="mx-auto w-full max-w-2xl text-sm text-ink-muted">
            {t.matching.detail.loading}
          </p>
        )}
      </>
    );
  }

  const mentor = <PersonName name={data.mentor.displayName} removed={data.mentor.removed} />;
  const mentee = <PersonName name={data.mentee.displayName} removed={data.mentee.removed} />;
  const sentences: ReactNode[] = [];
  if (data.coverage.forward.length > 0) {
    sentences.push(format(copy.mentorTeachesMentee, { mentor, mentee, skills: skillList(data.coverage.forward) }));
  }
  if (data.coverage.reverse.length > 0) {
    sentences.push(format(copy.menteeTeachesMentor, { mentor, mentee, skills: skillList(data.coverage.reverse) }));
  }
  if (data.goalBonusApplied) sentences.push(format(copy.goal, { mentee }));

  // Who has accepted, and who declined. A declined Match names its decliner in
  // place of the generic ending.
  const ending = endingOf(data.status);
  const notes: ReactNode[] = [
    format(data.mentorAccepted ? copy.accepted : copy.notAccepted, { name: mentor }),
    format(data.menteeAccepted ? copy.accepted : copy.notAccepted, { name: mentee }),
  ];
  if (data.declinedBy !== null) {
    notes.push(
      format(copy.declinedBy, {
        name: <PersonName name={data.declinedBy.displayName} removed={data.declinedBy.removed} />,
      }),
    );
  } else if (ending !== null) {
    notes.push(t.matching.endings[ending]);
  }

  const title = t.matching.detail.title;
  return (
    <>
      <PageTitle name={formatText(title, { number: data.roundNumber })} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold text-ink">{format(title, { number: data.roundNumber })}</h1>
        <Card>
          <dl className="flex min-w-0 flex-col gap-4">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-sm text-ink-muted">{parts.mentorLabel}</dt>
                <dd className="mt-1">
                  <StudentLink student={data.mentor} />
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-sm text-ink-muted">{parts.menteeLabel}</dt>
                <dd className="mt-1">
                  <StudentLink student={data.mentee} />
                </dd>
              </div>
            </div>
            <div className="min-w-0">
              <dt className="text-sm text-ink-muted">{parts.statusLabel}</dt>
              <dd className="mt-1 flex min-w-0 flex-col items-start gap-1 text-sm text-ink">
                <MatchStatusLabel status={data.status} />
                {notes.map((note, index) => (
                  // A name may be one 40-character word, which must wrap here.
                  <span key={index} className="min-w-0 max-w-full wrap-anywhere">
                    {note}
                  </span>
                ))}
              </dd>
            </div>
            <ScoreDetails score={data.compatibilityScore} sentences={sentences} />
            <div className="min-w-0">
              <dt className="text-sm text-ink-muted">{parts.missionLabel}</dt>
              <dd className="mt-1 text-ink">{t.matching.missions[data.mission]}</dd>
            </div>
          </dl>
        </Card>
        <Link to="/admin/rounds" className="self-start rounded text-link underline underline-offset-2 focus-ring">
          {t.matching.round.roundsLink}
        </Link>
      </div>
    </>
  );
}
