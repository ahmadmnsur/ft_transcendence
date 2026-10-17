import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  // The selected item's id. Leave it out to let Tabs keep its own selection.
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  // Names the tab list.
  label: string;
  className?: string;
}

export function Tabs({ items, value, defaultValue, onValueChange, label, className = '' }: TabsProps): React.JSX.Element {
  const base = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [ownValue, setOwnValue] = useState(defaultValue);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const wanted = value !== undefined ? value : ownValue;
  // An id that names no item, such as a stale URL parameter, falls back to the first tab.
  const current = items.some((item) => item.id === wanted) ? wanted : items[0]?.id;

  function select(index: number): void {
    const next = items[(index + items.length) % items.length];
    if (!next) return;
    if (value === undefined) setOwnValue(next.id);
    // Compared with the id asked for, not the tab shown, so choosing the
    // fallback tab still corrects a stale id such as an old URL parameter.
    if (next.id !== wanted) onValueChange?.(next.id);
    tabRefs.current.get(next.id)?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    // The arrow keys move the way they point: in a right-to-left tab list the
    // next tab is on the left.
    const forward = getComputedStyle(event.currentTarget).direction === 'rtl' ? -1 : 1;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      select(index + forward);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      select(index - forward);
    } else if (event.key === 'Home') {
      event.preventDefault();
      select(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      select(items.length - 1);
    }
  }

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
        {items.map((item, index) => {
          const selected = item.id === current;
          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) tabRefs.current.set(item.id, node);
                else tabRefs.current.delete(item.id);
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={[
                'shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150 focus-ring-inset',
                selected
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-ink-muted hover:border-neutral-300 hover:text-ink',
              ].join(' ')}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => {
        const selected = item.id === current;
        return (
          <div
            key={item.id}
            role="tabpanel"
            id={`${base}-panel-${item.id}`}
            aria-labelledby={`${base}-tab-${item.id}`}
            tabIndex={0}
            hidden={!selected}
            className="min-w-0 py-3 focus-ring"
          >
            {selected ? item.content : null}
          </div>
        );
      })}
    </div>
  );
}
