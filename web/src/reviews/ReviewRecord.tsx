import { LIMITS } from '@shared/limits';
import type { PrivateFeedback, ReviewDetail } from '../api/reviews';
import { Card } from '../design';
import { useI18n } from '../i18n/context';
import { EvidenceCard } from './EvidenceCard';

export function FeedbackAnswers({ feedback }: { feedback: PrivateFeedback }): React.JSX.Element {
  const { t, format } = useI18n();
  const copy = t.reviews;
  return (
    <dl className="flex min-w-0 flex-col gap-4">
      <Answer label={copy.usefulness} value={feedback.answerUsefulness} />
      <Answer label={copy.explanation} value={feedback.answerExplanation} />
      <div>
        <dt className="text-sm text-ink-muted">{copy.rating}</dt>
        <dd className="mt-1">
          {feedback.rating === null
            ? copy.noRating
            : format(copy.ratingValue, { rating: feedback.rating, max: LIMITS.privateFeedback.ratingMax })}
        </dd>
      </div>
    </dl>
  );
}

function Answer({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd dir="auto" className="mt-1 whitespace-pre-wrap wrap-anywhere">
        {value}
      </dd>
    </div>
  );
}

export interface ReviewRecordProps extends ReviewDetail {
  matchId: string;
  evidenceEditable: boolean;
}

export function ReviewRecord({
  review,
  privateFeedback,
  matchId,
  evidenceEditable,
}: ReviewRecordProps): React.JSX.Element | null {
  const { t } = useI18n();
  if (review === null) return null;
  return (
    <>
      <Card headingLevel={2} title={t.reviews.outcome}>
        <dl className="flex min-w-0 flex-col gap-4">
          <Answer label={t.reviews.learned} value={review.learned} />
          <Answer label={t.reviews.canNowDo} value={review.canNowDo} />
        </dl>
      </Card>
      <EvidenceCard matchId={matchId} reviewId={review.id} evidence={review.evidence} editable={evidenceEditable} />
      {privateFeedback !== null ? (
        <Card headingLevel={2} title={t.reviews.feedback}>
          <FeedbackAnswers feedback={privateFeedback} />
        </Card>
      ) : null}
    </>
  );
}
