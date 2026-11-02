import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { applyPostCreated, applyPostLikes, isPostLikesUpdate, isPostView } from '../api/feed';
import { subscribe } from '../realtime/socket';

export function FeedUpdates(): null {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      subscribe('post:created', (payload) => {
        if (isPostView(payload)) applyPostCreated(queryClient, payload);
      }),
    [queryClient],
  );
  useEffect(
    () =>
      subscribe('post:likes', (payload) => {
        if (isPostLikesUpdate(payload)) applyPostLikes(queryClient, payload);
      }),
    [queryClient],
  );
  return null;
}
