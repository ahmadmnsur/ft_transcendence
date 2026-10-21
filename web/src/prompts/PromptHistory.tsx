import { useEffect, useEffectEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { promptHistoryQueryOptions } from '../api/prompts';
import { Button, Card, Pagination } from '../design';
import { countPages } from '../design/components/pages';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';

export function PromptHistory({ page, onPageChange, admin = false }: { page: number; onPageChange: (page: number) => void; admin?: boolean }): React.JSX.Element {
  const { t, format, formatDateTime, errorText } = useI18n();
  const copy = t.prompts;
  const history = useQuery(promptHistoryQueryOptions(page, admin));
  const lastPage = history.data === undefined ? 1 : countPages(history.data);
  const correctingPage = history.isSuccess && page > lastPage;
  const settlePage = useEffectEvent((next: number) => onPageChange(next));
  useEffect(() => {
    if (correctingPage) settlePage(lastPage);
  }, [correctingPage, lastPage]);

  return <Card title={copy.history} headingLevel={2}>
    {history.isError ? <div role="alert"><p>{errorText(failureCode(history.error))}</p><Button onClick={() => void history.refetch()}>{copy.retry}</Button></div> : null}
    {history.data === undefined || correctingPage ? (history.isError ? null : <p aria-busy="true">{copy.loading}</p>) : <>
      {history.data.items.length === 0 ? <p>{copy.noPrompts}</p> : <ul className="flex flex-col divide-y divide-line">
        {history.data.items.map((prompt) => <li key={prompt.id} className="flex min-w-0 flex-col gap-2 py-3">
          <Link to="/prompts/$promptId" params={{ promptId: prompt.id }} className="rounded text-link underline focus-ring wrap-anywhere"><bdi dir="auto">{prompt.question}</bdi></Link>
          <p className="text-sm text-ink-muted">{prompt.live ? copy.live : copy.closed} · {formatDateTime(new Date(prompt.publishedAt))} · {format(copy.answerCount, { count: prompt.answerCount })}</p>
        </li>)}
      </ul>}
      <Pagination page={page} pageSize={history.data.pageSize} total={history.data.total} onPageChange={onPageChange} />
    </>}
  </Card>;
}
