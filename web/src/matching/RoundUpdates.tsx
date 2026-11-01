import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { readAnalyticsAgain } from '../api/analytics';
import { readMatchesAgain, readRoundViewsAgain } from '../api/matches';
import { subscribe } from '../realtime/socket';

export function RoundUpdates(): null {
  const queryClient = useQueryClient();
  useEffect(() => {
    const roundChanged = (): void => {
      readRoundViewsAgain(queryClient);
      void readAnalyticsAgain(queryClient);
    };
    const opened = subscribe('round:opened', roundChanged);
    const closed = subscribe('round:closed', roundChanged);
    const ready = subscribe('match:ready', () => readMatchesAgain(queryClient));
    return () => {
      opened();
      closed();
      ready();
    };
  }, [queryClient]);
  return null;
}
