import { useCallback, useEffect, useRef, useState } from 'react';
import { isDirectMessage, isTypingSignal, sendTyping } from '../api/messages';
import { subscribe } from '../realtime/socket';

const TYPING_REFRESH_MS = 2_000;
const TYPING_IDLE_MS = 1_500;
const TYPING_SHOWN_MS = 4_000;
const TYPING_GAP_MS = 1_100;

type Timer = ReturnType<typeof setTimeout> | undefined;

const lastTrueAt = new Map<string, number>();

export interface TypingSignals {
  changed: (text: string) => void;
  stop: () => void;
}

export function useTypingSignals(peerId: string): TypingSignals {
  const shownSinceRef = useRef<number | null>(null);
  const idleRef = useRef<Timer>(undefined);
  const pendingRef = useRef<Timer>(undefined);

  const start = useCallback(() => {
    pendingRef.current = undefined;
    if (!sendTyping(peerId, true)) return;
    const now = Date.now();
    shownSinceRef.current = now;
    lastTrueAt.set(peerId, now);
  }, [peerId]);

  const stop = useCallback(() => {
    clearTimeout(idleRef.current);
    clearTimeout(pendingRef.current);
    pendingRef.current = undefined;
    if (shownSinceRef.current === null) return;
    shownSinceRef.current = null;
    sendTyping(peerId, false);
  }, [peerId]);

  const changed = useCallback(
    (text: string) => {
      if (text.trim() === '') {
        stop();
        return;
      }
      const now = Date.now();
      if (shownSinceRef.current === null) {
        if (pendingRef.current === undefined) {
          const wait = (lastTrueAt.get(peerId) ?? 0) + TYPING_GAP_MS - now;
          if (wait <= 0) start();
          else pendingRef.current = setTimeout(start, wait);
        }
      } else if (now - shownSinceRef.current >= TYPING_REFRESH_MS) {
        start();
      }
      clearTimeout(idleRef.current);
      idleRef.current = setTimeout(stop, TYPING_IDLE_MS);
    },
    [peerId, start, stop],
  );

  useEffect(
    () =>
      subscribe('disconnect', () => {
        clearTimeout(idleRef.current);
        clearTimeout(pendingRef.current);
        pendingRef.current = undefined;
        shownSinceRef.current = null;
        lastTrueAt.clear();
      }),
    [],
  );

  useEffect(() => {
    window.addEventListener('pagehide', stop);
    return () => {
      window.removeEventListener('pagehide', stop);
      stop();
    };
  }, [stop]);

  return { changed, stop };
}

export function usePeerTyping(peerId: string): boolean {
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const hide = (): void => {
      clearTimeout(timer);
      setTyping(false);
    };
    const offTyping = subscribe('dm:typing', (payload) => {
      if (!isTypingSignal(payload) || payload.studentId !== peerId) return;
      if (!payload.typing) {
        hide();
        return;
      }
      clearTimeout(timer);
      setTyping(true);
      timer = setTimeout(hide, TYPING_SHOWN_MS);
    });
    const offMessage = subscribe('dm:message', (payload) => {
      if (isDirectMessage(payload) && payload.senderId === peerId) hide();
    });
    const offDisconnect = subscribe('disconnect', hide);
    return () => {
      offTyping();
      offMessage();
      offDisconnect();
      clearTimeout(timer);
    };
  }, [peerId]);

  return typing;
}
