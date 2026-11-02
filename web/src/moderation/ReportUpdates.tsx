import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { readModerationAgain } from '../api/moderation';
import { subscribe } from '../realtime/socket';

export function ReportUpdates(): null {
  const queryClient = useQueryClient();
  useEffect(
    () => subscribe('reports:changed', () => void readModerationAgain(queryClient)),
    [queryClient],
  );
  return null;
}
