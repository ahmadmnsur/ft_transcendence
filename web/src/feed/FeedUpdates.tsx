import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { applyPostCreated, applyPostLikes, applyPostRemoved, isPostLikesUpdate, isPostRemoved, isPostView } from '../api/feed';
import { readPromptAnswersAgain, readPromptsAgain } from '../api/prompts';
import { subscribe } from '../realtime/socket';

export function FeedUpdates(): null {
  const queryClient = useQueryClient();
  useEffect(() => {
    const created = subscribe('post:created', (payload) => {
      if (!isPostView(payload)) return;
      applyPostCreated(queryClient, payload);
      if (payload.origin === 'PROMPT_ANSWER') void readPromptAnswersAgain(queryClient, payload.prompt.id);
    });
    const likes = subscribe('post:likes', (payload) => {
      if (isPostLikesUpdate(payload)) applyPostLikes(queryClient, payload);
    });
    const removed = subscribe('post:removed', (payload) => {
      if (isPostRemoved(payload)) applyPostRemoved(queryClient, payload.postId);
    });
    const published = subscribe('prompt:published', () => void readPromptsAgain(queryClient));
    return () => {
      created();
      likes();
      removed();
      published();
    };
  }, [queryClient]);
  return null;
}
