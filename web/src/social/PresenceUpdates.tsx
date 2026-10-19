import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { applyPresence, isPresenceUpdate } from '../api/friends';
import { subscribe } from '../realtime/socket';

// §7.4: `presence:update` keeps the cached Friends list live. Mounted once in
// the shell, beside the connection, so the list is right whichever page is
// open and `/friends` shows the current status as soon as it opens. A payload
// of any other shape is ignored.
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
