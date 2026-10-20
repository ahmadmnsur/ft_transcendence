import { useEffect, useRef, type ReactNode } from 'react';
import type { MatchStatus } from '@shared/matches';
import type { SkillView } from '../api/profile';
import { Banner } from '../design';
import { useI18n } from '../i18n/context';

// The pieces every Match screen shares: the status label, the Score with its
// explanation, and the notice an accept or a decline leaves.

// §8.2: a Score is at most 100.
const SCORE_MAX = 100;

// The colour only repeats what the label says.
const statusTones: Record<MatchStatus, string> = {
  MATCHED: 'bg-primary-50 text-primary-900',
  ACCEPTED: 'bg-primary-100 text-primary-900',
  COMPLETED: 'bg-success-100 text-success-900',
  LAPSED: 'bg-surface-muted text-ink',
  DECLINED: 'bg-warning-100 text-warning-900',
  TERMINATED_BY_ADMIN: 'bg-danger-100 text-danger-900',
};

// §8.8: a Match's status, as a short label.
export function MatchStatusLabel({ status }: { status: MatchStatus }): React.JSX.Element {
  const { t } = useI18n();
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusTones[status]}`}>
      {t.matching.statuses[status]}
    </span>
  );
}

// What an ended Match's status means; a Match in progress has no ending.
export function endingOf(status: MatchStatus): Exclude<MatchStatus, 'MATCHED' | 'ACCEPTED'> | null {
  return status === 'MATCHED' || status === 'ACCEPTED' ? null : status;
}

// A list of Skill names as one value: `Intl.ListFormat` in the current
// language, each name isolated (§3.5.5).
export function useSkillList(): (skills: readonly SkillView[]) => React.ReactElement {
  const { list } = useI18n();
  return (skills) => list(skills.map((skill) => skill.name));
}

// §8.11: the Compatibility Score with its explanation, or "Matched by an Admin"
// and no number for a hand-made Match. The number never shows without the
// sentences, which the caller writes from the frozen coverage, the goal flag
// and the reader's side. A `<dt>`/`<dd>` pair inside the caller's `<dl>`.
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

// What an accept or a decline reported, kept as what happened rather than as
// a text, so it follows a language switch.
export type MatchNotice = { kind: 'accepted' } | { kind: 'declined' } | { kind: 'failed'; code: unknown };

// The notice of the last accept or decline. It lives on the page, not in the
// Match's card: after a decline on `/match` the Match is no longer the
// current one, and its card goes. Focus moves to each new notice.
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
