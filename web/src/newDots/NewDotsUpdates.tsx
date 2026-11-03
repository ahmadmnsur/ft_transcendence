import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribe } from '../realtime/socket';
import { readNewDotsAgain, useNewDots } from './useNewDots';

const EVENTS = [
  'dm:message', 'match:ready', 'match:changed', 'friends:changed', 'prompt:published',
  'reports:changed', 'round:opened', 'round:closed', 'session:changed', 'new-dots:changed',
];

export function NewDotsUpdates(): null {
  const client = useQueryClient();
  const dots = useNewDots();
  const any = Object.values(dots).some(Boolean);
  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon === null) return;
    icon.href = any ? '/favicon-dot.svg' : '/favicon.svg';
    return () => { icon.href = '/favicon.svg'; };
  }, [any]);
  useEffect(() => {
    const cleanups = EVENTS.map((event) => subscribe(event, () => readNewDotsAgain(client)));
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [client]);
  return null;
}
