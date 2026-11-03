import { useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { sessionQueryOptions } from '../api/session';
import { subscribe } from './socket';

export function SessionUpdates(): null {
  const queryClient = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    const readAgain = async (): Promise<void> => {
      await queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 });
      await router.invalidate();
    };
    return subscribe('session:changed', () => void readAgain().catch(() => undefined));
  }, [queryClient, router]);
  return null;
}
