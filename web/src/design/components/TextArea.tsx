import { useCallback, useId, useLayoutEffect, useRef, useState, type ComponentProps, type Ref, type RefCallback } from 'react';
import { CharacterCount } from './CharacterCount';
import { FieldShell, attachRef, capText, controlClass, useField, useTextDirection, type FieldMessage } from './field';

export interface TextAreaProps extends ComponentProps<'textarea'> {
  label: string;
  hint?: FieldMessage;
  error?: FieldMessage;
  hideLabel?: boolean;
  maxChars?: number;
  maxRows?: number;
  singleLine?: boolean;
}

const COPIED = [
  'box-sizing',
  'width',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-style',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'font-stretch',
  'font-feature-settings',
  'font-variant-ligatures',
  'letter-spacing',
  'word-spacing',
  'line-height',
  'text-indent',
  'text-transform',
  'text-rendering',
  'tab-size',
  'white-space',
  'word-break',
  'overflow-wrap',
  'direction',
  'unicode-bidi',
];

const VIEWPORT_SHARE = 0.4;

let twin: HTMLTextAreaElement | undefined;

function contentHeight(area: HTMLTextAreaElement, style: CSSStyleDeclaration): number {
  if (twin === undefined) {
    twin = document.createElement('textarea');
    twin.setAttribute('aria-hidden', 'true');
    twin.tabIndex = -1;
    twin.readOnly = true;
  }
  for (const name of COPIED) twin.style.setProperty(name, style.getPropertyValue(name));
  twin.style.setProperty('position', 'fixed');
  twin.style.setProperty('inset', '0 auto auto 0');
  twin.style.setProperty('z-index', '-1');
  twin.style.setProperty('visibility', 'hidden');
  twin.style.setProperty('pointer-events', 'none');
  twin.style.setProperty('overflow', 'hidden');
  twin.style.setProperty('height', '0');
  twin.style.setProperty('min-height', '0');
  twin.style.setProperty('max-height', 'none');
  twin.value = area.value === '' ? area.placeholder : area.value;
  if (!twin.isConnected) document.body.append(twin);
  return twin.scrollHeight;
}

function px(value: string): number {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function useAutoSize(maxRows: number, ref: Ref<HTMLTextAreaElement> | undefined): { ref: RefCallback<HTMLTextAreaElement>; resize: () => void } {
  const element = useRef<HTMLTextAreaElement | null>(null);
  const resize = useCallback(() => {
    const area = element.current;
    if (!area) return;
    const style = getComputedStyle(area);
    const lineHeight = px(style.lineHeight) || px(style.fontSize) * 1.5;
    const padding = px(style.paddingTop) + px(style.paddingBottom);
    const border = px(style.borderTopWidth) + px(style.borderBottomWidth);
    const oneRow = lineHeight + padding + border;
    const screen = (window.visualViewport?.height ?? window.innerHeight) * VIEWPORT_SHARE;
    const max = Math.max(oneRow, Math.min(lineHeight * Math.max(maxRows, area.rows) + padding + border, screen));
    const min = Math.min(lineHeight * Math.max(1, area.rows) + padding + border, max);
    const needed = contentHeight(area, style) + border;
    area.style.height = `${Math.min(Math.max(needed, min), max)}px`;
    area.style.overflowY = needed > max + 1 ? 'auto' : 'hidden';
  }, [maxRows]);
  const setRef = useCallback(
    (node: HTMLTextAreaElement | null): (() => void) => {
      element.current = node;
      const detach = attachRef(ref, node);
      let width = node?.offsetWidth;
      const observer =
        node && typeof ResizeObserver === 'function'
          ? new ResizeObserver(() => {
              if (node.offsetWidth === width) return;
              width = node.offsetWidth;
              resize();
            })
          : undefined;
      const viewport = node ? window.visualViewport : null;
      viewport?.addEventListener('resize', resize);
      if (node) {
        observer?.observe(node);
        void document.fonts?.ready.then(() => {
          if (element.current === node) resize();
        });
      }
      return () => {
        viewport?.removeEventListener('resize', resize);
        observer?.disconnect();
        element.current = null;
        detach();
      };
    },
    [ref, resize],
  );
  return { ref: setRef, resize };
}

export function TextArea({ label, hint, error, hideLabel, id, rows = 4, maxChars, maxRows = 10, singleLine = false, dir, onInput, onChange, onCompositionStart, onCompositionEnd, onKeyDown, ref, 'aria-describedby': describedBy, 'aria-invalid': invalid, className, ...rest }: TextAreaProps): React.JSX.Element {
  const ownLimitId = `area-limit-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const limitId = maxChars !== undefined && hint === undefined ? ownLimitId : undefined;
  const described = [limitId, describedBy].filter(Boolean).join(' ') || undefined;
  const { controlProps, hintId, errorId } = useField('area', { id, hint, error, 'aria-describedby': described, 'aria-invalid': invalid });
  const [cappedAt, setCappedAt] = useState<string | null>(null);
  const autoSize = useAutoSize(maxRows, ref);
  const { resize } = autoSize;
  const direction = useTextDirection<HTMLTextAreaElement>({ dir, onInput, ref: autoSize.ref });
  useLayoutEffect(resize, [resize, rest.value, rest.placeholder, rows]);
  const counted = typeof rest.value === 'string' && maxChars !== undefined ? rest.value : undefined;
  return (
    <FieldShell
      label={label}
      hideLabel={hideLabel}
      controlId={controlProps.id}
      hint={hint}
      error={error}
      hintId={hintId}
      errorId={errorId}
      className={className}
      aside={
        counted !== undefined && maxChars !== undefined ? (
          <CharacterCount value={counted} maxChars={maxChars} capped={cappedAt === counted} limitId={limitId} />
        ) : undefined
      }
    >
      <textarea
        rows={rows}
        {...rest}
        {...controlProps}
        {...direction}
        onKeyDown={(event) => {
          if (singleLine && event.key === 'Enter' && !event.nativeEvent.isComposing) event.preventDefault();
          onKeyDown?.(event);
        }}
        {...capText(
          { maxChars, singleLine },
          {
            onChange: (event) => {
              onChange?.(event);
              resize();
            },
            onCompositionStart,
            onCompositionEnd,
          },
          { previous: typeof rest.value === 'string' ? rest.value : undefined, onCapped: setCappedAt },
        )}
        className={`${controlClass(Boolean(error))} block resize-none overflow-hidden`}
      />
    </FieldShell>
  );
}
