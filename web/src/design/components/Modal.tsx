import { useEffect, useId, useLayoutEffect, useRef, type ReactNode, type SyntheticEvent } from 'react';
import { CloseIcon } from '../icons/CloseIcon';
import { IconButton } from './IconButton';

export interface ModalProps {
  open: boolean;
  title: string;
  // Read out with the title when the dialog opens: for a confirm, what the
  // action does and whether it can be undone.
  description?: ReactNode;
  // A request, not a command: Escape, the backdrop and the close button all
  // call it, and the dialog stays open until open turns false. A form with
  // unsaved text can ask first, for example with a nested confirm Modal.
  onClose: () => void;
  // Left out for a confirm whose description says it all.
  children?: ReactNode;
  // The actions, right-aligned; a destructive one can take className="mr-auto"
  // to sit apart at the start.
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const widths: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

// A native modal <dialog>: the browser makes the page behind it inert, keeps
// focus inside, sends Escape to the topmost dialog only, and returns focus
// when it closes. The open prop stays the source of truth.
export function Modal({ open, title, description, onClose, children, footer, size = 'md' }: ModalProps): React.JSX.Element {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Set when this component closes the dialog, so the close event that
  // follows is not reported back as the user closing it.
  const closingRef = useRef(false);
  const openRef = useRef(open);
  useLayoutEffect(() => {
    openRef.current = open;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    let cancelled = false;
    const show = (): void => {
      if (!cancelled && !dialog.open) dialog.showModal();
    };
    // React runs a nested dialog's effect before its parent's. When both open
    // in one render, the nested one waits so it lands above its parent.
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

  // React passes a nested dialog's events up through this one; each dialog
  // answers only for itself.
  const ownEvent = (event: SyntheticEvent<HTMLDialogElement>): boolean => event.target === event.currentTarget;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description != null ? descriptionId : undefined}
      onCancel={(event) => {
        // A cancel the page may not stop comes just before the dialog closes,
        // and the close event reports that one, so it asks only once.
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
        // The browser can close a dialog without a cancel event, for example on
        // a second Escape in a row. If the caller kept it open, show it again.
        const dialog = event.currentTarget;
        setTimeout(() => {
          if (openRef.current && dialog.isConnected && !dialog.open) dialog.showModal();
        }, 0);
      }}
      onMouseDown={(event) => {
        // The dialog has no padding of its own, so a press on the dialog
        // element itself is a press on the backdrop.
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
                <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <IconButton label="Close dialog" size="sm" onClick={onClose}>
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
