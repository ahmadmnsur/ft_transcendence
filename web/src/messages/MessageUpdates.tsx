import { useEffect } from 'react';
import { useMatchRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { applyDirectMessage, isDirectMessage } from '../api/messages';
import { subscribe } from '../realtime/socket';

export function MessageUpdates(): null {
  const queryClient = useQueryClient();
  const matchRoute = useMatchRoute();
  const thread = matchRoute({ to: '/messages/$peerId' });
  const openPeerId = thread ? thread.peerId.toLowerCase() : null;
  useEffect(
    () =>
      subscribe('dm:message', (payload) => {
        if (isDirectMessage(payload)) applyDirectMessage(queryClient, payload, openPeerId);
      }),
    [queryClient, openPeerId],
  );
  return null;
}
