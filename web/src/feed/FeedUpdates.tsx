import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { applyPostCreated, isPostView } from '../api/feed';
import { subscribe } from '../realtime/socket';

// §7.4: `post:created` keeps the cached feed live. Mounted once in the shell
// so the cached feed is right whichever page is open. A payload of any other
// shape is ignored.
export function FeedUpdates(): null {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      subscribe('post:created', (payload) => {
        if (isPostView(payload)) applyPostCreated(queryClient, payload);
      }),
    [queryClient],
  );
  return null;
}
