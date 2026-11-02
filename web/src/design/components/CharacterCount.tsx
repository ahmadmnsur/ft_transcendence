import { useEffect, useRef, useState } from 'react';
import { charLength } from '@shared/limits';
import { useI18n } from '../../i18n/context';

const ANNOUNCE_AFTER_MS = 1000;

type Stage = 'far' | 'near' | 'low' | 'end';

export function countShownFrom(maxChars: number): number {
  return Math.max(10, Math.ceil(maxChars / 5));
}

function stageOf(remaining: number, maxChars: number): Stage {
  if (remaining <= 0) return 'end';
  if (remaining <= Math.max(10, Math.ceil(maxChars / 20))) return 'low';
  return remaining <= countShownFrom(maxChars) ? 'near' : 'far';
}

export interface CharacterCountProps {
  value: string;
  maxChars: number;
  capped: boolean;
  counting?: boolean;
  limitId?: string;
}

export function CharacterCount({ value, maxChars, capped, counting = true, limitId }: CharacterCountProps): React.JSX.Element {
  const { t, formatText } = useI18n();
  const copy = t.design.characterCount;
  const remaining = maxChars - charLength(value);
  const stage = stageOf(remaining, maxChars);
  const reached = capped;
  const count = remaining >= 0 ? formatText(copy.left, { count: remaining }) : formatText(copy.over, { count: -remaining });
  const message = reached ? formatText(copy.reached, { count: maxChars }) : count;
  const shown = reached || (counting && stage !== 'far');
  const initial = useRef(value);
  const touched = useRef(false);
  const spoken = useRef<Stage>('far');
  const [announced, setAnnounced] = useState('');

  useEffect(() => {
    if (reached || value !== initial.current) touched.current = true;
    if (!touched.current) return;
    if (reached) {
      spoken.current = 'end';
      setAnnounced(message);
      return;
    }
    if (!counting || stage === 'far') {
      spoken.current = 'far';
      setAnnounced('');
      return;
    }
    if (stage === 'near' && spoken.current === 'near') return;
    const timer = setTimeout(() => {
      spoken.current = stage;
      setAnnounced(message);
    }, ANNOUNCE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [value, reached, counting, stage, message]);

  const tone = remaining < 0 ? 'font-medium text-ink-danger' : remaining === 0 ? 'font-medium text-ink' : 'text-ink-muted';
  return (
    <>
      {shown ? (
        <p aria-hidden="true" className={`mt-1 text-xs tabular-nums ${tone}`}>
          {message}
        </p>
      ) : null}
      <span aria-live="polite" className="sr-only">
        {announced}
      </span>
      {limitId === undefined ? null : (
        <span id={limitId} className="sr-only">
          {formatText(copy.limit, { count: maxChars })}
        </span>
      )}
    </>
  );
}
