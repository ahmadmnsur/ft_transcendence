import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { rereadThread, sendAndApply } from '../api/messages';
import { charLength, isValidText, LIMITS } from '@shared/limits';
import { Banner, Button, TextArea } from '../design';
import { useI18n } from '../i18n/context';

type ComposerStatus =
  | { kind: 'empty' }
  | { kind: 'tooLong' }
  | { kind: 'failed'; code: string }
  | { kind: 'disconnected' }
  | { kind: 'unconfirmed' };

export function Composer({ peerId }: { peerId: string }): React.JSX.Element {
  const { t, formatText, errorText } = useI18n();
  const copy = t.messages.page;
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<ComposerStatus | undefined>(undefined);
  const textRef = useRef<HTMLTextAreaElement>(null);

  function statusTitle(current: ComposerStatus): string {
    if (current.kind === 'empty') return copy.empty;
    if (current.kind === 'tooLong') return formatText(copy.tooLong, { limit: LIMITS.directMessage.maxChars });
    if (current.kind === 'failed') return errorText(current.code);
    return current.kind === 'disconnected' ? copy.notConnected : copy.mayHaveSaved;
  }

  async function onSend(): Promise<void> {
    if (pending) return;
    const raw = text;
    const body = text.trim();
    if (charLength(body) === 0) {
      setStatus({ kind: 'empty' });
      return;
    }
    if (charLength(body) > LIMITS.directMessage.maxChars) {
      setStatus({ kind: 'tooLong' });
      return;
    }
    if (!isValidText(body, LIMITS.directMessage, true)) {
      setStatus({ kind: 'failed', code: 'validation_failed' });
      return;
    }
    setPending(true);
    try {
      const outcome = await sendAndApply(queryClient, peerId, body);
      if (outcome.kind === 'sessionChanged') return;
      if (outcome.kind === 'sent') {
        setText((current) => (current === raw ? '' : current));
        setStatus(undefined);
        textRef.current?.focus();
      } else if (outcome.kind === 'refused') {
        setStatus({ kind: 'failed', code: outcome.code });
        if (outcome.code === 'dm_unavailable') void rereadThread(queryClient, peerId);
      } else if (outcome.kind === 'notConnected') {
        setStatus({ kind: 'disconnected' });
      } else {
        setStatus({ kind: 'unconfirmed' });
        void rereadThread(queryClient, peerId);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void onSend();
      }}
      className="flex min-w-0 flex-col gap-3"
    >
      {status !== undefined ? <Banner tone="danger" title={statusTitle(status)} /> : null}
      <TextArea
        ref={textRef}
        label={copy.composerLabel}
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          {pending ? copy.sending : copy.send}
        </Button>
      </div>
    </form>
  );
}
