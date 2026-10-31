import { Link } from '@tanstack/react-router';
import { useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { acceptMatch, declineMatch, type MatchView } from '../api/matches';
import { Button, Card, Modal, PersonName } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { StudentLink } from '../profile/StudentLink';
import { MatchStatusLabel, ScoreDetails, endingOf, useSkillList, type MatchNotice } from './MatchParts';

export function PairMatchCard({
  match,
  onNotice,
}: {
  match: MatchView;
  onNotice: (notice: MatchNotice) => void;
}): React.JSX.Element {
  const { t, format, formatText, personNameValue } = useI18n();
  const parts = t.matching.match;
  const copy = t.matching.pair;
  const skillList = useSkillList();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<'accept' | 'decline' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);

  const partner = <PersonName name={match.partner.displayName} removed={match.partner.removed} />;
  const asMentor = match.myRole === 'MENTOR';
  const sentences: ReactNode[] = [];
  if (match.coverage.forward.length > 0) {
    sentences.push(
      format(asMentor ? copy.youTeachPartner : copy.partnerTeachesYou, {
        partner,
        skills: skillList(match.coverage.forward),
      }),
    );
  }
  if (match.coverage.reverse.length > 0) {
    sentences.push(
      format(asMentor ? copy.partnerTeachesYou : copy.youTeachPartner, {
        partner,
        skills: skillList(match.coverage.reverse),
      }),
    );
  }
  if (match.goalBonusApplied) sentences.push(asMentor ? format(copy.goalPartners, { partner }) : copy.goalYours);

  const ending = endingOf(match.status);
  let progress: ReactNode;
  if (ending !== null) progress = t.matching.endings[ending];
  else if (match.iAccepted && match.partnerAccepted) progress = copy.bothAccepted;
  else if (match.iAccepted) progress = format(copy.youAccepted, { partner });
  else if (match.partnerAccepted) progress = format(copy.partnerAccepted, { partner });
  else progress = copy.neitherAccepted;

  const canAccept = match.status === 'MATCHED' && !match.iAccepted;
  const canDecline = ending === null;

  async function onAccept(): Promise<void> {
    if (pending !== null) return;
    setPending('accept');
    try {
      if ((await acceptMatch(queryClient, match.id)) !== undefined) onNotice({ kind: 'accepted' });
    } catch (error) {
      onNotice({ kind: 'failed', code: failureCode(error) });
    } finally {
      setPending(null);
    }
  }

  async function onDecline(): Promise<void> {
    if (pending !== null) return;
    setPending('decline');
    try {
      const declined = await declineMatch(queryClient, match.id);
      setConfirming(false);
      if (declined !== undefined) onNotice({ kind: 'declined' });
    } catch (error) {
      setConfirming(false);
      onNotice({ kind: 'failed', code: failureCode(error) });
    } finally {
      setPending(null);
    }
  }

  const partnerName = personNameValue(match.partner.displayName, match.partner.removed);
  return (
    <Card title={format(parts.roundNumber, { number: match.roundNumber })} headingLevel={2}>
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex min-w-0 flex-col gap-1">
          <StudentLink student={match.partner} />
          <p className="text-sm text-ink-muted">{asMentor ? copy.youAreMentor : copy.youAreMentee}</p>
        </div>
        <dl className="flex min-w-0 flex-col gap-4">
          <div className="min-w-0">
            <dt className="text-sm text-ink-muted">{parts.statusLabel}</dt>
            <dd className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-sm text-ink">
              <MatchStatusLabel status={match.status} />
              <span className="min-w-0 max-w-full wrap-anywhere">{progress}</span>
            </dd>
          </div>
          <ScoreDetails score={match.compatibilityScore} sentences={sentences} />
          <div className="min-w-0">
            <dt className="text-sm text-ink-muted">{parts.missionLabel}</dt>
            <dd className="mt-1 text-ink">{t.matching.missions[match.mission]}</dd>
          </div>
        </dl>
        {match.myRole === 'MENTEE' && match.status === 'ACCEPTED' ? (
          <Link
            to="/matches/$matchId/review"
            params={{ matchId: match.id }}
            className="self-start rounded text-link underline focus-ring"
          >
            {t.reviews.reviewLink}
          </Link>
        ) : null}
        {canAccept || canDecline ? (
          <div className="flex flex-wrap gap-2">
            {canAccept ? (
              <Button
                loading={pending === 'accept'}
                aria-disabled={pending === 'decline' ? true : undefined}
                onClick={() => void onAccept()}
              >
                {pending === 'accept' ? copy.accepting : copy.accept}
              </Button>
            ) : null}
            {canDecline ? (
              <Button
                variant="secondary"
                aria-disabled={pending !== null ? true : undefined}
                onClick={() => {
                  if (pending === null) setConfirming(true);
                }}
              >
                {copy.decline}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <Modal
        open={confirming}
        size="sm"
        title={formatText(copy.declineConfirm.title, { partner: partnerName })}
        description={formatText(copy.declineConfirm.body, { number: match.roundNumber })}
        onClose={() => {
          if (pending === null) setConfirming(false);
        }}
        initialFocusRef={keepRef}
        footer={
          <>
            <Button
              ref={keepRef}
              variant="secondary"
              onClick={() => {
                if (pending === null) setConfirming(false);
              }}
            >
              {copy.declineConfirm.keep}
            </Button>
            <Button variant="danger" loading={pending === 'decline'} onClick={() => void onDecline()}>
              {pending === 'decline' ? copy.declining : copy.declineConfirm.confirm}
            </Button>
          </>
        }
      />
    </Card>
  );
}
