import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { livePromptQueryOptions } from '../api/prompts';
import { Button, Card } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { failureCode } from '../profile/failure';
import { PromptHistory } from '../prompts/PromptHistory';

export function PromptsPage(): React.JSX.Element {
  const { t, errorText } = useI18n();
  const live = useQuery(livePromptQueryOptions());
  const search = useSearch({ from: '/prompts' });
  const navigate = useNavigate({ from: '/prompts' });
  return <div className="flex min-w-0 flex-col gap-6">
    <PageTitle name={t.prompts.title} />
    <h1 className="text-2xl font-semibold">{t.prompts.title}</h1>
    <Card title={t.prompts.live} headingLevel={2}>
      {live.isError ? <div role="alert"><p>{errorText(failureCode(live.error))}</p><Button onClick={() => void live.refetch()}>{t.prompts.retry}</Button></div> : live.data === undefined ? <p aria-busy="true">{t.prompts.loading}</p> : live.data.prompt === null ? <p>{t.prompts.noPrompts}</p> : <>
        <Link to="/prompts/$promptId" params={{ promptId: live.data.prompt.id }} className="rounded text-link underline focus-ring wrap-anywhere"><bdi dir="auto">{live.data.prompt.question}</bdi></Link>
        {live.data.answeredByMe ? <p>{t.prompts.answered}</p> : null}
      </>}
    </Card>
    <PromptHistory page={search.page ?? 1} onPageChange={(page) => void navigate({ search: { page: page > 1 ? page : undefined } })} />
  </div>;
}
