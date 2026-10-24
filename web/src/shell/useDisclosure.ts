import { useEffect, useId, useRef, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';

// A button that shows and hides a panel of links: the disclosure pattern, not
// an ARIA menu, so Tab walks the links and a screen reader reads them as
// links. The panel closes on Escape, which returns focus to the button; on a
// press, or focus, outside the root that holds both; on a link chosen inside
// it, the page it is on included; and when the page changes some other way,
// such as the browser's Back.
export function useDisclosure<Root extends HTMLElement>(): {
  open: boolean;
  rootProps: {
    ref: React.RefObject<Root | null>;
    onKeyDown: (event: React.KeyboardEvent) => void;
    onBlur: (event: React.FocusEvent) => void;
  };
  buttonProps: {
    ref: React.RefObject<HTMLButtonElement | null>;
    'aria-expanded': boolean;
    'aria-controls': string;
    onClick: () => void;
  };
  panelProps: { id: string; hidden: boolean; onClick: (event: React.MouseEvent) => void };
} {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<Root>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [shownOn, setShownOn] = useState(pathname);
  if (pathname !== shownOn) {
    setShownOn(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent): void {
      if (event.target instanceof Node && rootRef.current?.contains(event.target) !== true) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return {
    open,
    rootProps: {
      ref: rootRef,
      onKeyDown(event) {
        if (event.key !== 'Escape' || !open) return;
        setOpen(false);
        buttonRef.current?.focus();
      },
      // No related target means focus left the page, such as for another
      // tab: the panel stays as it was.
      onBlur(event) {
        const next = event.relatedTarget;
        if (next instanceof Node && rootRef.current?.contains(next) !== true) setOpen(false);
      },
    },
    buttonProps: {
      ref: buttonRef,
      'aria-expanded': open,
      'aria-controls': panelId,
      onClick: () => setOpen((value) => !value),
    },
    panelProps: {
      id: panelId,
      hidden: !open,
      onClick(event) {
        if (event.target instanceof Element && event.target.closest('a') !== null) setOpen(false);
      },
    },
  };
}
