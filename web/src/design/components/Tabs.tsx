import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultIndex?: number;
  onChange?: (index: number) => void;
  ariaLabel: string;
}

export function Tabs({ items, defaultIndex = 0, onChange, ariaLabel }: TabsProps): React.JSX.Element {
  const base = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [active, setActive] = useState(defaultIndex);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = Math.min(active, items.length - 1);

  function select(index: number): void {
    const next = (index + items.length) % items.length;
    setActive(next);
    onChange?.(next);
    tabRefs.current[next]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      select(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      select(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      select(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      select(items.length - 1);
    }
  }

  return (
    <div className="min-w-0">
      <div role="tablist" aria-label={ariaLabel} className="flex gap-1 overflow-x-auto border-b border-neutral-200">
        {items.map((item, index) => {
          const selected = index === current;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[index] = node;
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
                'shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
                selected
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-neutral-700 hover:border-neutral-300 hover:text-neutral-900',
              ].join(' ')}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item, index) => {
        const selected = index === current;
        return (
          <div
            key={item.id}
            role="tabpanel"
            id={`${base}-panel-${item.id}`}
            aria-labelledby={`${base}-tab-${item.id}`}
            tabIndex={0}
            hidden={!selected}
            className="min-w-0 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          >
            {selected ? item.content : null}
          </div>
        );
      })}
    </div>
  );
}
