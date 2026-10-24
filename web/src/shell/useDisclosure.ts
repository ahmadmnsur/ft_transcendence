import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';

// A button that shows and hides a panel of links: the disclosure pattern, not
// an ARIA menu, so Tab walks the links and a screen reader reads them as
// links. Only the button and the panel count as inside it, so the panel must
// follow the button in the DOM for Tab to reach it. The panel closes on
// Escape, wherever focus is; on a press, or focus, outside the button and the
// panel; on a link chosen inside it, the page it is on included; and when the
// page changes some other way, such as the browser's Back.
export function useDisclosure<Panel extends HTMLElement>(): {
  open: boolean;
  close: () => void;
  buttonProps: {
    ref: React.RefObject<HTMLButtonElement | null>;
    'aria-expanded': boolean;
    'aria-controls': string;
    onClick: () => void;
  };
  panelProps: {
    ref: React.RefObject<Panel | null>;
    id: string;
    hidden: boolean;
    onClick: (event: React.MouseEvent) => void;
  };
} {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<Panel>(null);
  const panelId = useId();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [shownOn, setShownOn] = useState(pathname);
  if (pathname !== shownOn) {
    setShownOn(pathname);
    setOpen(false);
  }
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function inside(node: Node): boolean {
      return buttonRef.current?.contains(node) === true || panelRef.current?.contains(node) === true;
    }
    function onPointerDown(event: PointerEvent): void {
      if (event.target instanceof Node && !inside(event.target)) setOpen(false);
    }
    // Focus that goes nowhere, to another tab or to `<body>` after a press on
    // the panel's text, fires no `focusin`: the panel stays as it was.
    function onFocusIn(event: FocusEvent): void {
      if (event.target instanceof Node && !inside(event.target)) setOpen(false);
    }
    // On the document, not the panel, so Escape still closes it once focus
    // has fallen to `<body>`: after a press on the panel's text, or in a
    // browser that does not focus a pressed button. Focus there, or inside
    // the panel about to hide, goes back to the button.
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      setOpen(false);
      const focused = document.activeElement;
      if (focused === null || focused === document.body || inside(focused)) buttonRef.current?.focus();
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return {
    open,
    close,
    buttonProps: {
      ref: buttonRef,
      'aria-expanded': open,
      'aria-controls': panelId,
      onClick: () => setOpen((value) => !value),
    },
    panelProps: {
      ref: panelRef,
      id: panelId,
      hidden: !open,
      onClick(event) {
        const link = event.target instanceof Element ? event.target.closest('a') : null;
        if (link === null) return;
        setOpen(false);
        // The page it is on opens no new page to take focus, and the link
        // hides with the panel, so focus goes back to the button instead of
        // `<body>`. A search alone does not move focus either (`RootLayout`).
        if (link.pathname === pathname) buttonRef.current?.focus();
      },
    },
  };
}
