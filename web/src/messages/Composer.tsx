import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { rereadThread, sendAndApply } from '../api/messages';
import { charLength, isValidText, LIMITS } from '@shared/limits';
import { Banner, Button, ChevronDownIcon, TextArea } from '../design';
import { useI18n } from '../i18n/context';
import { subscribe } from '../realtime/socket';
import { usePeerTyping, useTypingSignals } from './typing';

function isFieldCheck(status: ComposerStatus | undefined): boolean {
  return status?.kind === 'empty' || status?.kind === 'tooLong';
}

interface ComposerProps {
  peerId: string;
  peerName: string;
  newMessage: boolean;
  onShowNewest: () => void;
}

type ComposerStatus =
  | { kind: 'empty' }
  | { kind: 'tooLong' }
  | { kind: 'failed'; code: string }
  | { kind: 'disconnected' }
  | { kind: 'unconfirmed' };

export function Composer({ peerId, peerName, newMessage, onShowNewest }: ComposerProps): React.JSX.Element {
  const { t, formatText, errorText } = useI18n();
  const copy = t.messages.page;
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<ComposerStatus | undefined>(undefined);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const typingSignals = useTypingSignals(peerId);
  const peerTyping = usePeerTyping(peerId);

  const { changed: typingChanged } = typingSignals;
  useEffect(() => {
    typingChanged(text);
  }, [text, typingChanged]);

  useEffect(
    () =>
      subscribe('connect', () => {
        setStatus((current) => (current?.kind === 'disconnected' ? undefined : current));
      }),
    [],
  );

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
      textRef.current?.focus();
      return;
    }
    if (charLength(body) > LIMITS.directMessage.maxChars) {
      setStatus({ kind: 'tooLong' });
      textRef.current?.focus();
      return;
    }
    if (!isValidText(body, LIMITS.directMessage, true)) {
      setStatus({ kind: 'failed', code: 'validation_failed' });
      textRef.current?.focus();
      return;
    }
    typingSignals.stop();
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
      className="sticky bottom-0 z-20 -mx-4 mt-auto flex min-w-0 flex-col gap-1.5 border-t border-line bg-canvas px-4 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex h-5 min-w-0 items-center gap-2 text-xs text-ink-muted">
        <span role="status" className={newMessage ? 'sr-only' : 'flex min-w-0 items-center gap-2'}>
          {peerTyping ? (
            <>
              <span aria-hidden="true" className="flex shrink-0 items-center gap-1">
                <span className="size-1.5 rounded-full bg-ink-subtle motion-safe:animate-typing-dot" />
                <span className="size-1.5 rounded-full bg-ink-subtle motion-safe:animate-typing-dot motion-safe:[animation-delay:160ms]" />
                <span className="size-1.5 rounded-full bg-ink-subtle motion-safe:animate-typing-dot motion-safe:[animation-delay:320ms]" />
              </span>
              <span className="min-w-0 truncate">{formatText(copy.typing, { name: peerName })}</span>
            </>
          ) : null}
        </span>
        {newMessage ? (
          <button
            type="button"
            onClick={onShowNewest}
            className="relative inline-flex min-w-0 items-center gap-1 rounded font-medium text-link underline-offset-2 hover:underline focus-ring pointer-coarse:before:absolute pointer-coarse:before:-inset-x-2 pointer-coarse:before:-inset-y-3.5"
          >
            <ChevronDownIcon size={14} />
            <span className="truncate">{formatText(copy.newBelow, { name: peerName })}</span>
          </button>
        ) : null}
      </div>
      <p role="alert" className="sr-only">
        {status !== undefined && isFieldCheck(status) ? statusTitle(status) : null}
      </p>
      {status !== undefined && !isFieldCheck(status) ? <Banner tone="danger" title={statusTitle(status)} /> : null}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <TextArea
          ref={textRef}
          label={copy.composerLabel}
          hideLabel
          placeholder={copy.composerLabel}
          aria-keyshortcuts="Control+Enter Meta+Enter"
          rows={2}
          maxRows={6}
          maxChars={LIMITS.directMessage.maxChars}
          value={text}
          error={status !== undefined && isFieldCheck(status) ? statusTitle(status) : undefined}
          onChange={(event) => {
            setText(event.target.value);
            setStatus((current) => (current !== undefined && current.kind !== 'unconfirmed' ? undefined : current));
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey) || event.nativeEvent.isComposing) return;
            event.preventDefault();
            void onSend();
          }}
        />
        <Button type="submit" loading={pending}>
          {pending ? copy.sending : copy.send}
        </Button>
      </div>
    </form>
  );
}
