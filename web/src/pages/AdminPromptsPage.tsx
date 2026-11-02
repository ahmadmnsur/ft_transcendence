import { useId, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isValidText, LIMITS } from '@shared/limits';
import { publishPrompt } from '../api/prompts';
import { Banner, Button, Card, Modal, TextArea } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { failureCode } from '../profile/failure';
import { PromptHistory } from '../prompts/PromptHistory';

export function AdminPromptsPage(): React.JSX.Element {
  const { t, errorText, formatText } = useI18n();
  const copy = t.prompts;
  const questionLimits = { min: LIMITS.promptQuestion.minChars, count: LIMITS.promptQuestion.maxChars };
  const client = useQueryClient();
  const search = useSearch({ from: '/admin/prompts' });
  const navigate = useNavigate({ from: '/admin/prompts' });
  const [question, setQuestion] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const publishHintId = useId();
  const publish = useMutation({
    mutationFn: publishPrompt,
    onSuccess: () => { setQuestion(''); void client.invalidateQueries({ queryKey: ['prompts'] }); void navigate({ search: {} }); },
    onSettled: () => setConfirming(false),
  });
  return <div className="flex min-w-0 flex-col gap-6">
    <PageTitle name={copy.adminTitle} />
    <h1 className="text-2xl font-semibold">{copy.adminTitle}</h1>
    {publish.isSuccess ? <Banner tone="success" title={copy.published} /> : null}
    {publish.isError ? <Banner tone="danger" title={errorText(failureCode(publish.error))} /> : null}
    <Card>
      <form noValidate className="flex flex-col gap-4" onSubmit={(event) => {
        event.preventDefault();
        if (publish.isPending) return;
        const valid = isValidText(question, LIMITS.promptQuestion, true);
        setInvalid(!valid);
        if (valid) setConfirming(true);
        else questionRef.current?.focus();
      }}>
        <div className="flex flex-col gap-2">
          <TextArea ref={questionRef} label={copy.question} value={question} maxChars={LIMITS.promptQuestion.maxChars} aria-describedby={publishHintId} onChange={(event) => { setQuestion(event.target.value); setInvalid(false); publish.reset(); }} hint={formatText(copy.textLimit, questionLimits)} error={invalid ? formatText(question.trim() === '' ? copy.textEmpty : copy.textInvalid, questionLimits) : undefined} disabled={publish.isPending} />
          <p id={publishHintId} className="text-sm text-ink-muted">{copy.publishHint}</p>
        </div>
        <Button type="submit" loading={publish.isPending}>{publish.isPending ? copy.publishing : copy.publish}</Button>
      </form>
    </Card>
    <PromptHistory admin page={search.page ?? 1} onPageChange={(page) => void navigate({ search: { page: page > 1 ? page : undefined } })} />
    <Modal open={confirming} title={copy.confirmTitle} initialFocusRef={cancelRef} onClose={() => { if (!publish.isPending) setConfirming(false); }}>
      <p className="mb-3">{copy.publishHint}</p>
      <p dir="auto" className="mb-4 whitespace-pre-wrap wrap-anywhere">{question}</p>
      <div className="flex flex-wrap gap-3">
        <Button ref={cancelRef} variant="secondary" disabled={publish.isPending} onClick={() => setConfirming(false)}>{copy.cancel}</Button>
        <Button loading={publish.isPending} onClick={() => { if (!publish.isPending) publish.mutate(question); }}>{copy.publish}</Button>
      </div>
    </Modal>
  </div>;
}
