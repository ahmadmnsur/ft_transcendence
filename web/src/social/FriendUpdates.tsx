import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { readListsAgain } from '../api/friends';
import { subscribe } from '../realtime/socket';

export function FriendUpdates(): null {
  const queryClient = useQueryClient();
  useEffect(
    () => subscribe('friends:changed', () => readListsAgain(queryClient)),
    [queryClient],
  );
  return null;
}
