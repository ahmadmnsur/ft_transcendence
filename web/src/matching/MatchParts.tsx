import { useEffect, useRef, type ReactNode } from 'react';
import { isInProgress, type InProgressStatus, type MatchStatus } from '@shared/matches';
import type { SkillView } from '../api/profile';
import { Banner } from '../design';
import { useI18n } from '../i18n/context';


const SCORE_MAX = 100;

const statusTones: Record<MatchStatus, string> = {
  MATCHED: 'bg-primary-50 text-primary-900',
  ACCEPTED: 'bg-primary-100 text-primary-900',
  COMPLETED: 'bg-success-100 text-success-900',
  LAPSED: 'bg-surface-muted text-ink',
  DECLINED: 'bg-warning-100 text-warning-900',
  TERMINATED_BY_ADMIN: 'bg-danger-100 text-danger-900',
};

export function MatchStatusLabel({ status }: { status: MatchStatus }): React.JSX.Element {
  const { t } = useI18n();
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusTones[status]}`}>
      {t.matching.statuses[status]}
    </span>
  );
}

export function endingOf(status: MatchStatus): Exclude<MatchStatus, InProgressStatus> | null {
  return isInProgress(status) ? null : status;
}

export function useSkillList(): (skills: readonly SkillView[]) => React.ReactElement {
  const { list } = useI18n();
  return (skills) => list(skills.map((skill) => skill.name));
}

export function ScoreDetails({ score, sentences }: { score: number | null; sentences: ReactNode[] }): React.JSX.Element {
  const { t, format } = useI18n();
  const copy = t.matching.match;
  return (
    <div className="min-w-0">
      <dt className="text-sm text-ink-muted">{copy.scoreLabel}</dt>
      <dd className="mt-1 min-w-0">
        {score === null ? (
          <p className="font-semibold text-ink">{copy.handMade}</p>
        ) : (
          <p className="text-2xl font-semibold text-ink tabular-nums">{format(copy.scoreValue, { score, max: SCORE_MAX })}</p>
        )}
        {sentences.length > 0 ? (
          <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-sm text-ink">
            {sentences.map((sentence, index) => (
              <li key={index}>{sentence}</li>
            ))}
          </ul>
        ) : null}
      </dd>
    </div>
  );
}

export type MatchNotice = { kind: 'accepted' } | { kind: 'declined' } | { kind: 'failed'; code: unknown };

export function MatchNoticeBanner({ notice }: { notice: MatchNotice | undefined }): React.JSX.Element | null {
  const { t, errorText } = useI18n();
  const copy = t.matching.pair;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (notice !== undefined) ref.current?.focus();
  }, [notice]);
  if (notice === undefined) return null;
  return (
    <div ref={ref} tabIndex={-1} className="rounded-lg focus-ring">
      {notice.kind === 'failed' ? (
        <Banner tone="danger" title={errorText(notice.code)} />
      ) : (
        <Banner tone="success" title={notice.kind === 'accepted' ? copy.accepted : copy.declined} />
      )}
    </div>
  );
}
