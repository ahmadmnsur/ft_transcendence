import { useEffect, useRef, useState } from 'react';

export interface ProfileNavItem {
  id: string;
  label: string;
}

const READING_LINE_PX = 32;

export function ProfileNav({
  label,
  items,
  layout,
}: {
  label: string;
  items: ProfileNavItem[];
  layout: 'list' | 'grid';
}): React.JSX.Element {
  const [active, setActive] = useState(items[0]?.id);
  const pinnedRef = useRef<string | null>(null);
  const settleRef = useRef<number | undefined>(undefined);
  const ids = items.map((item) => item.id).join(' ');

  useEffect(() => {
    const sectionIds = ids.split(' ');
    let frame = 0;
    function readPosition(): void {
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 0;
      let current = sectionIds[0];
      for (const id of sectionIds) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= header + READING_LINE_PX) current = id;
      }
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atEnd) current = sectionIds[sectionIds.length - 1];
      setActive(current);
    }
    function onScroll(): void {
      if (pinnedRef.current !== null) {
        window.clearTimeout(settleRef.current);
        settleRef.current = window.setTimeout(() => {
          pinnedRef.current = null;
        }, 150);
        return;
      }
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(readPosition);
    }
    readPosition();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ids]);

  function onJump(event: React.MouseEvent<HTMLAnchorElement>, id: string): void {
    const target = document.getElementById(id);
    if (target === null) return;
    event.preventDefault();
    pinnedRef.current = id;
    setActive(id);
    window.clearTimeout(settleRef.current);
    settleRef.current = window.setTimeout(() => {
      pinnedRef.current = null;
    }, 150);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    const heading = target.querySelector<HTMLElement>('h2');
    if (heading !== null && !heading.hasAttribute('tabindex')) heading.tabIndex = -1;
    (heading ?? target).focus({ preventScroll: true });
  }

  const grid = layout === 'grid';
  return (
    <nav aria-label={label} className={grid ? undefined : 'sticky top-[calc(var(--header-height,0px)+2rem)]'}>
      <ul className={grid ? 'grid grid-cols-2 gap-1 sm:grid-cols-3' : 'flex flex-col gap-0.5'}>
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
            <a
              href={`#${item.id}`}
              aria-current={!grid && active === item.id ? 'location' : undefined}
              onClick={(event) => onJump(event, item.id)}
              className={`block rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink focus-ring aria-[current=location]:bg-primary-50 aria-[current=location]:font-medium aria-[current=location]:text-primary-700 ${
                grid ? 'h-full text-pretty pointer-coarse:py-3' : ''
              }`.trim()}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
