import { useEffect, useId, useLayoutEffect, useRef, type ReactNode, type RefObject, type SyntheticEvent } from 'react';
import { CloseIcon } from '../icons/CloseIcon';
import { useI18n } from '../../i18n/context';
import { IconButton } from './IconButton';

export interface ModalProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  size?: 'sm' | 'md' | 'lg';
}

const widths: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({ open, title, description, onClose, children, footer, initialFocusRef, size = 'md' }: ModalProps): React.JSX.Element {
  const { t } = useI18n();
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closingRef = useRef(false);
  const openRef = useRef(open);
  const startRef = useRef(initialFocusRef);
  useLayoutEffect(() => {
    openRef.current = open;
    startRef.current = initialFocusRef;
  });

  function reveal(dialog: HTMLDialogElement): void {
    dialog.showModal();
    startRef.current?.current?.focus();
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    let cancelled = false;
    const show = (): void => {
      if (cancelled || dialog.open) return;
      reveal(dialog);
    };
    const parent = dialog.parentElement?.closest('dialog');
    if (parent && !parent.open) queueMicrotask(show);
    else show();
    return () => {
      cancelled = true;
      if (!dialog.open) return;
      closingRef.current = true;
      dialog.close();
    };
  }, [open]);

  const ownEvent = (event: SyntheticEvent<HTMLDialogElement>): boolean => event.target === event.currentTarget;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description != null ? descriptionId : undefined}
      onCancel={(event) => {
        if (!ownEvent(event) || !event.cancelable) return;
        event.preventDefault();
        onClose();
      }}
      onClose={(event) => {
        if (!ownEvent(event)) return;
        if (closingRef.current) {
          closingRef.current = false;
          return;
        }
        onClose();
        const dialog = event.currentTarget;
        setTimeout(() => {
          if (openRef.current && dialog.isConnected && !dialog.open) reveal(dialog);
        }, 0);
      }}
      onMouseDown={(event) => {
        if (ownEvent(event)) onClose();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-hidden rounded-xl bg-surface p-0 text-ink shadow-lg backdrop:bg-black/50 ${widths[size]}`}
    >
      {open ? (
        <div className="flex max-h-[calc(100dvh-2rem)] min-w-0 flex-col">
          <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold text-ink">
                {title}
              </h2>
              {description != null ? (
                <div id={descriptionId} className="mt-1 text-sm text-ink-muted">
                  {description}
                </div>
              ) : null}
            </div>
            <IconButton label={t.design.modal.close} size="sm" onClick={onClose}>
              <CloseIcon size={18} />
            </IconButton>
          </div>
          {children != null ? <div className="min-w-0 overflow-y-auto px-4 pb-4 pt-3 sm:px-6 sm:pb-6">{children}</div> : <div className="pb-4 sm:pb-6" />}
          {footer ? (
            <div className="flex flex-wrap justify-end gap-2 border-t border-line px-4 py-3 sm:px-6">{footer}</div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
