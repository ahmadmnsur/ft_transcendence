import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '../icons/CloseIcon';
import { IconButton } from './IconButton';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const widths: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({ open, title, onClose, children, size = 'md' }: ModalProps): React.JSX.Element | null {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);
  const close = useEffectEvent(onClose);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;

    const dialog = dialogRef.current;
    dialog?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusables = [...dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.tabIndex >= 0 && !element.hasAttribute('disabled') && element.getClientRects().length > 0);
      const active = document.activeElement;
      if (focusables.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused.current instanceof HTMLElement) previouslyFocused.current.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        className={`max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-xl bg-white p-4 shadow-lg focus-visible:outline-none sm:p-6 ${widths[size]}`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id={titleId} className="min-w-0 text-lg font-semibold text-neutral-900">
            {title}
          </h2>
          <IconButton label="Close dialog" size="sm" onClick={onClose}>
            <CloseIcon size={18} />
          </IconButton>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
