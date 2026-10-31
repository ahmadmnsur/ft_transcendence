import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { applyPresence, isPresenceUpdate } from '../api/friends';
import { subscribe } from '../realtime/socket';

export function PresenceUpdates(): null {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      subscribe('presence:update', (payload) => {
        if (isPresenceUpdate(payload)) applyPresence(queryClient, payload);
      }),
    [queryClient],
  );
  return null;
}
