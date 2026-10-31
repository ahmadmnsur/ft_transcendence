import { useEffect, useRef, useState, type ReactNode } from 'react';

const FIRST_CONTROL = 'input:not([tabindex="-1"]), select, textarea, button:not([tabindex="-1"])';

export function useDisclosure(): {
  open: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  panelRef: React.RefObject<HTMLElement | null>;
  show: (focusPanel?: boolean) => void;
  hide: (returnFocus?: boolean) => void;
} {
  const [open, setOpen] = useState(false);
  const [focusTarget, setFocusTarget] = useState<'panel' | 'trigger' | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (focusTarget === null) return;
    if (focusTarget === 'trigger') triggerRef.current?.focus();
    else panelRef.current?.querySelector<HTMLElement>(FIRST_CONTROL)?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  return {
    open,
    triggerRef,
    panelRef,
    show: (focusPanel = true) => {
      setOpen(true);
      setFocusTarget(focusPanel ? 'panel' : null);
    },
    hide: (returnFocus = true) => {
      setOpen(false);
      setFocusTarget(returnFocus ? 'trigger' : null);
    },
  };
}

export function SettingRow({
  title,
  titleId,
  status,
  description,
  action,
  children,
}: {
  title: string;
  titleId: string;
  status?: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex min-w-0 flex-col gap-4 py-5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-64">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 id={titleId} className="text-sm font-semibold text-ink">
              {title}
            </h3>
            {status}
          </div>
          <p className="mt-1 text-sm text-ink-muted text-pretty">{description}</p>
        </div>
        {action != null ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}

export const revealClass = 'transition-opacity duration-150 starting:opacity-0';
