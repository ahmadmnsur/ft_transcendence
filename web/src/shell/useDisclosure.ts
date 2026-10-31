import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';

export function useDisclosure<Panel extends HTMLElement>(): {
  open: boolean;
  show: () => void;
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
  const show = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function inside(node: Node): boolean {
      return buttonRef.current?.contains(node) === true || panelRef.current?.contains(node) === true;
    }
    function onPointerDown(event: PointerEvent): void {
      if (event.target instanceof Node && !inside(event.target)) setOpen(false);
    }
    function onFocusIn(event: FocusEvent): void {
      if (event.target instanceof Node && !inside(event.target)) setOpen(false);
    }
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
    show,
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
        if (link === null || !event.defaultPrevented) return;
        setOpen(false);
        if (link.pathname === pathname) buttonRef.current?.focus();
      },
    },
  };
}
