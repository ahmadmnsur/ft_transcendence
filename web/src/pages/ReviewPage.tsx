import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isValidText, LIMITS } from '@shared/limits';
import { isUuid } from '@shared/uuid';
import { ApiProtocolError } from '../api/client';
import { matchQueryOptions } from '../api/matches';
import { submitReview, type ReviewInput } from '../api/reviews';
import { Banner, Button, Card, Select, TextArea } from '../design';
import { useI18n } from '../i18n/context';
import { NotFoundPage, PageTitle } from '../layout';
import { failureCode } from '../profile/failure';
import { ReviewRecord } from '../reviews/ReviewRecord';
import type { EarnResult } from '../api/progress';
import { EarnPanel } from '../progress/EarnPanel';

export function ReviewPage(): React.JSX.Element {
  const { matchId } = useParams({ from: '/matches/$matchId/review' });
  const [earned, setEarned] = useState<{ matchId: string; result: EarnResult } | null>(null);
  const { t, errorText } = useI18n();
  const match = useQuery({ ...matchQueryOptions(matchId), enabled: isUuid(matchId) });
  if (!isUuid(matchId) || (match.error instanceof ApiProtocolError && match.error.status === 404))
    return <NotFoundPage />;
  if (match.data === undefined)
    return (
      <div className="mx-auto w-full max-w-2xl">
        <PageTitle name={t.reviews.title} />
        {match.isError ? (
          <>
            <Banner tone="danger" title={errorText(failureCode(match.error))} />
            <Button onClick={() => void match.refetch()}>{t.reviews.retry}</Button>
          </>
        ) : (
          <p aria-busy="true">{t.reviews.loading}</p>
        )}
      </div>
    );
  const data = match.data;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageTitle name={t.reviews.title} />
      <h1 className="text-2xl font-semibold text-ink">{t.reviews.title}</h1>
      {earned?.matchId === matchId ? <EarnPanel earned={earned.result} title={t.reviews.submitted} /> : null}
      {data.review !== null ? (
        <ReviewRecord {...data} />
      ) : data.myRole === 'MENTEE' && data.status === 'ACCEPTED' ? (
        <ReviewForm key={matchId} matchId={matchId} onSubmitted={(result) => setEarned({ matchId, result })} />
      ) : (
        <Banner tone="info" title={t.reviews.unavailable} />
      )}
      <Link
        to="/matches/$matchId"
        params={{ matchId }}
        className="self-start rounded text-link underline focus-ring"
      >
        {t.reviews.back}
      </Link>
    </div>
  );
}

function ReviewForm({ matchId, onSubmitted }: { matchId: string; onSubmitted: (result: EarnResult) => void }): React.JSX.Element | null {
  const { t, format, formatText, errorText } = useI18n();
  const copy = t.reviews;
  const client = useQueryClient();
  const [learned, setLearned] = useState('');
  const [canNowDo, setCanNowDo] = useState('');
  const [usefulness, setUsefulness] = useState('');
  const [explanation, setExplanation] = useState('');
  const [takeaway, setTakeaway] = useState('');
  const [rating, setRating] = useState('');
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<{ code: unknown } | null>(null);
  const invalid = {
    learned: !isValidText(learned, LIMITS.learningOutcome, true),
    canNowDo: !isValidText(canNowDo, LIMITS.learningOutcome, true),
    usefulness: !isValidText(usefulness, LIMITS.privateFeedback, true),
    explanation: !isValidText(explanation, LIMITS.privateFeedback, true),
    takeaway: !isValidText(takeaway, LIMITS.publicTakeaway, false),
  };
  const outcomeLimits = { min: LIMITS.learningOutcome.minChars, count: LIMITS.learningOutcome.maxChars };
  const feedbackLimits = { min: LIMITS.privateFeedback.minChars, count: LIMITS.privateFeedback.maxChars };
  const takeawayLimits = { min: LIMITS.publicTakeaway.minChars, count: LIMITS.publicTakeaway.maxChars };
  const { ratingMin, ratingMax } = LIMITS.privateFeedback;
  const ratings = Array.from({ length: ratingMax - ratingMin + 1 }, (_, index) => ratingMin + index);

  async function send(event: React.SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending || submitted) return;
    setAttempted(true);
    if (Object.values(invalid).some(Boolean)) {
      setFailure({ code: 'validation_failed' });
      return;
    }
    setPending(true);
    setFailure(null);
    const input: ReviewInput = {
      learningOutcome: { learned: learned.trim(), canNowDo: canNowDo.trim() },
      privateFeedback: {
        answerUsefulness: usefulness.trim(),
        answerExplanation: explanation.trim(),
        ...(rating === '' ? {} : { rating: Number(rating) }),
      },
      publicTakeaway: takeaway.trim(),
    };
    try {
      const result = await submitReview(client, matchId, input);
      if (result !== null) { setSubmitted(true); onSubmitted(result); }
    } catch (error) {
      setFailure({ code: failureCode(error) });
    } finally {
      setPending(false);
    }
  }

  if (submitted) return null;

  return (
    <form noValidate onSubmit={(event) => void send(event)} className="flex min-w-0 flex-col gap-6">
      {failure !== null ? <Banner tone="danger" title={errorText(failure.code)} /> : null}
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-6">
        <Card headingLevel={2} title={copy.outcome} subtitle={copy.outcomeReaders}>
          <div className="flex flex-col gap-4">
            <TextArea
              label={copy.learned}
              hint={format(copy.textLimit, outcomeLimits)}
              error={attempted && invalid.learned ? format(copy.textInvalid, outcomeLimits) : undefined}
              required
              value={learned}
              onChange={(e) => setLearned(e.target.value)}
            />
            <TextArea
              label={copy.canNowDo}
              hint={format(copy.textLimit, outcomeLimits)}
              error={attempted && invalid.canNowDo ? format(copy.textInvalid, outcomeLimits) : undefined}
              required
              value={canNowDo}
              onChange={(e) => setCanNowDo(e.target.value)}
            />
          </div>
        </Card>
        <Card headingLevel={2} title={copy.feedback} subtitle={copy.feedbackReaders}>
          <div className="flex flex-col gap-4">
            <TextArea
              label={copy.usefulness}
              hint={format(copy.textLimit, feedbackLimits)}
              error={attempted && invalid.usefulness ? format(copy.textInvalid, feedbackLimits) : undefined}
              required
              value={usefulness}
              onChange={(e) => setUsefulness(e.target.value)}
            />
            <TextArea
              label={copy.explanation}
              hint={format(copy.textLimit, feedbackLimits)}
              error={attempted && invalid.explanation ? format(copy.textInvalid, feedbackLimits) : undefined}
              required
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
            />
            <Select label={copy.rating} value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="">{copy.noRating}</option>
              {ratings.map((value) => (
                <option key={value} value={value}>
                  {formatText(copy.ratingValue, { rating: value, max: ratingMax })}
                </option>
              ))}
            </Select>
          </div>
        </Card>
        <Card headingLevel={2} title={copy.takeaway} subtitle={copy.takeawayReaders}>
          <TextArea
            label={copy.takeaway}
            hint={format(copy.takeawayLimit, takeawayLimits)}
            error={attempted && invalid.takeaway ? format(copy.takeawayInvalid, takeawayLimits) : undefined}
            rows={2}
            required
            value={takeaway}
            onChange={(e) => setTakeaway(e.target.value)}
          />
        </Card>
        <p className="text-sm text-ink-muted">{copy.immutable}</p>
        <Button type="submit" loading={pending}>
          {pending ? copy.submitting : copy.submit}
        </Button>
      </fieldset>
    </form>
  );
}
