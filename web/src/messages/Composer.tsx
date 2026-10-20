import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { rereadThread, sendAndApply } from '../api/messages';
import { charLength, isValidText, LIMITS } from '@shared/limits';
import { Banner, Button, TextArea } from '../design';
import { useI18n } from '../i18n/context';

// What the status Banner says, kept as what happened rather than as a text,
// so it follows a language switch: a check this page made against the text
// (nothing written, or past the limit), a failure's code, or the send's
// unknown end. The checks' sentences are read where the Banner is built at
// render, so a language switch re-says them.
type ComposerStatus =
  | { kind: 'empty' }
  | { kind: 'tooLong' }
  | { kind: 'failed'; code: string }
  | { kind: 'disconnected' }
  | { kind: 'unconfirmed' };

// §7.3: the composer under one peer's messages. It first checks the text as
// the API does (§6.0.3) and says so without sending; the send itself goes
// over the socket, and each of §7.3's outcomes decides what the Banner
// shows. A refused or unanswered send keeps the text typed, so a fix is an
// edit, never a rewrite.
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
    // Everything the gateway will check, checked before sending, so the
    // common mistakes never leave the page (§6.0.3).
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
      if (outcome.kind === 'sent') {
        // Freshly sent only: a message typed meanwhile is the next one's
        // draft, and clearing it would throw it away.
        setText((current) => (current === raw ? '' : current));
        setStatus(undefined);
        // The click that sent moved the focus to the button; the field
        // takes it back, so the next message is typed without a click.
        textRef.current?.focus();
      } else if (outcome.kind === 'refused') {
        // The peer may have become unavailable after the page was read; the
        // page's own data is read again beside the Banner.
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
      {/* The field alone stays writable while the send runs — not disabled,
      which would drop its focus. The click that sends puts the focus on the
      button, so the field's ref takes it back once the send has succeeded,
      and the next message is typed at once. The button's spinner says the
      send is still running. */}
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
