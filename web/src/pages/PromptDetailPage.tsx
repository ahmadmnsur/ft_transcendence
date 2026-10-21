import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isValidText, LIMITS } from '@shared/limits';
import { isUuid } from '@shared/uuid';
import { ApiProtocolError } from '../api/client';
import { FEED_QUERY_KEY } from '../api/feed';
import { answerPrompt, PROMPT_ANSWERS_QUERY_KEY, readPromptAnswers } from '../api/prompts';
import { sessionQueryOptions } from '../api/session';
import { Banner, Button, Card, TextArea } from '../design';
import { PostCard } from '../feed/PostCard';
import { useI18n } from '../i18n/context';
import { NotFoundPage, PageTitle } from '../layout';
import { failureCode } from '../profile/failure';
import { EarnPanel } from '../progress/EarnPanel';

export function PromptDetailPage(): React.JSX.Element {
  const { promptId } = useParams({ from: '/prompts/$promptId' });
  return <PromptDetail key={promptId} promptId={promptId} />;
}

function PromptDetail({ promptId }: { promptId: string }): React.JSX.Element {
  const { t, formatDateTime, errorText } = useI18n();
  const copy = t.prompts;
  const client = useQueryClient();
  const session = useQuery(sessionQueryOptions()).data;
  const wellFormedId = isUuid(promptId);
  const answers = useInfiniteQuery({
    queryKey: [...PROMPT_ANSWERS_QUERY_KEY, promptId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => readPromptAnswers(promptId, pageParam),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: wellFormedId,
  });
  const detail = answers.data?.pages[0];
  const [body, setBody] = useState('');
  const [invalid, setInvalid] = useState(false);
  const answer = useMutation({
    mutationFn: (text: string) => answerPrompt(promptId, text),
    onSuccess: () => { setBody(''); },
    onSettled: () => { void client.invalidateQueries({ queryKey: ['prompts'] }); void client.invalidateQueries({ queryKey: FEED_QUERY_KEY }); for (const key of ['progress', 'me', 'students']) void client.invalidateQueries({ queryKey: [key] }); },
  });
  const canAnswer = detail?.live && !detail.answeredByMe && session?.authenticated && session.student.role !== 'ADMIN' && !answer.isSuccess;
  if (!wellFormedId) return <NotFoundPage />;
  if (answers.isError && answers.error instanceof ApiProtocolError && answers.error.status === 404) {
    return <NotFoundPage />;
  }
  return <div className="flex min-w-0 flex-col gap-6">
    <PageTitle name={copy.title} />
    <h1 className="text-2xl font-semibold">{copy.title}</h1>
    <Link to="/prompts" className="rounded text-link underline focus-ring">{copy.back}</Link>
    {answers.isError ? <Banner tone="danger" title={errorText(failureCode(answers.error))} body={<Button onClick={() => void answers.refetch()}>{copy.retry}</Button>} /> : null}
    {detail === undefined ? (answers.isError ? null : <p aria-busy="true">{copy.loading}</p>) : <>
      <Card title={detail.live ? copy.live : copy.closed} headingLevel={2}>
        <p dir="auto" className="whitespace-pre-wrap wrap-anywhere">{detail.prompt.question}</p>
        <p className="mt-3 text-sm text-ink-muted">{formatDateTime(new Date(detail.prompt.publishedAt))}</p>
      </Card>
      {answer.isSuccess ? <EarnPanel earned={answer.data} title={copy.saved} /> : detail.answeredByMe ? <p role="status">{copy.answered}</p> : null}
      {answer.isError ? <Banner tone="danger" title={errorText(failureCode(answer.error))} /> : null}
      {canAnswer ? <Card>
        <form noValidate className="flex flex-col gap-4" onSubmit={(event) => {
          event.preventDefault();
          if (answer.isPending) return;
          const valid = isValidText(body, LIMITS.promptAnswer, true);
          setInvalid(!valid);
          if (valid) answer.mutate(body);
        }}>
          <TextArea label={copy.answerLabel} value={body} onChange={(event) => { setBody(event.target.value); setInvalid(false); answer.reset(); }} hint={copy.answerHint} error={invalid ? errorText('validation_failed') : undefined} disabled={answer.isPending} />
          <Button type="submit" loading={answer.isPending}>{answer.isPending ? copy.submitting : copy.submit}</Button>
        </form>
      </Card> : null}
      <Card title={copy.answers} headingLevel={2}>
        {detail.items.length === 0 ? <p>{copy.noAnswers}</p> : <ul className="flex flex-col divide-y divide-line">
          {answers.data?.pages.flatMap((page) => page.items).map((post) => <li key={post.id} className="min-w-0 py-4">
            <PostCard post={post} showPrompt={false} />
          </li>)}
        </ul>}
        {answers.hasNextPage ? <Button variant="secondary" loading={answers.isFetchingNextPage} onClick={() => void answers.fetchNextPage()}>{copy.more}</Button> : null}
      </Card>
    </>}
  </div>;
}
