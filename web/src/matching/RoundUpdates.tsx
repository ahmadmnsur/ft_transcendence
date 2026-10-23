import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { readAnalyticsAgain } from '../api/analytics';
import { readMatchesAgain, readRoundViewsAgain } from '../api/matches';
import { subscribe } from '../realtime/socket';

// §7.4: Round events are content-free signals, so nothing is read from their
// payloads. Mounted once in the shell to read Round, Match and Analytics
// views again. The profile's progress refetch on `round:closed` belongs to
// its card (`progress/ProgressCard.tsx`).
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
