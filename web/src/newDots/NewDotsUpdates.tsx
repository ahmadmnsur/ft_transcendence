import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribe } from '../realtime/socket';
import { readNewDotsAgain, useNewDots } from './useNewDots';

const EVENTS = [
  'dm:message', 'match:ready', 'match:changed', 'friends:changed', 'prompt:published',
  'reports:changed', 'round:opened', 'round:closed', 'session:changed', 'new-dots:changed', 'post:removed',
];

export function NewDotsUpdates(): null {
  const client = useQueryClient();
  const dots = useNewDots();
  const anyDot = Object.values(dots).some(Boolean);
  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon === null) return;
    icon.href = anyDot ? '/favicon-dot.svg' : '/favicon.svg';
    return () => { icon.href = '/favicon.svg'; };
  }, [anyDot]);
  useEffect(() => {
    const cleanups = EVENTS.map((event) => subscribe(event, () => readNewDotsAgain(client)));
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [client]);
  return null;
}
