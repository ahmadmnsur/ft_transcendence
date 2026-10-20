import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { applyDirectMessage, isDirectMessage } from '../api/messages';
import { subscribe } from '../realtime/socket';

// §7.4: `dm:message` keeps the open page's messages and the threads list's
// rows live. Mounted once in the shell, beside the presence reaction, so a
// Direct Message shows as soon as it arrives on whichever page is open. A
// payload of any other shape is ignored.
export function MessageUpdates(): null {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      subscribe('dm:message', (payload) => {
        if (isDirectMessage(payload)) applyDirectMessage(queryClient, payload);
      }),
    [queryClient],
  );
  return null;
}
