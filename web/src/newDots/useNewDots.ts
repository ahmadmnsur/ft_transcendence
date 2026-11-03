import { useEffect, useRef } from 'react';
import { queryOptions, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import { SESSION_QUERY_KEY, sessionQueryOptions, type SessionValue } from '../api/session';

export type NewDots = Record<'messages' | 'match' | 'friends' | 'prompts' | 'feedback' | 'reports' | 'feed', boolean>;
export type OpenedPage = keyof NewDots;

export const NEW_DOTS_QUERY_KEY = ['new-dots'] as const;
const EMPTY_DOTS: NewDots = {
  messages: false, match: false, friends: false, prompts: false, feedback: false, reports: false, feed: false,
};

function dotsQueryOptions(studentId: string | null) {
  return queryOptions({
    queryKey: [...NEW_DOTS_QUERY_KEY, studentId],
    enabled: studentId !== null,
    queryFn: ({ signal }) => apiFetch<NewDots>('/me/new-dots', { signal }),
  });
}

export function readNewDotsAgain(client: QueryClient): void {
  void client.invalidateQueries({ queryKey: NEW_DOTS_QUERY_KEY });
}

export function useNewDots(): NewDots {
  const { data: session } = useQuery(sessionQueryOptions());
  const studentId = session?.authenticated === true ? session.student.id : null;
  const { data } = useQuery(dotsQueryOptions(studentId));
  return studentId === null ? EMPTY_DOTS : data ?? EMPTY_DOTS;
}

export function useOpenedPage(page: OpenedPage, matchId?: string, enabled = true): void {
  const client = useQueryClient();
  const { data: session } = useQuery(sessionQueryOptions());
  const studentId = session?.authenticated === true ? session.student.id : null;
  const previous = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (!enabled || studentId === null) return;
    const queryKey = dotsQueryOptions(studentId).queryKey;
    previous.current = client.getQueryData<NewDots>(queryKey)?.[page];
    let active = true;
    let opening = false;
    let pending = false;
    let failed = false;
    const current = (): boolean => {
      const value = client.getQueryData<SessionValue>(SESSION_QUERY_KEY);
      return active && value?.authenticated === true && value.student.id === studentId;
    };
    const open = async (): Promise<void> => {
      if (!current()) return;
      if (opening) {
        pending = true;
        return;
      }
      opening = true;
      try {
        const dots = await apiFetch<NewDots>('/me/new-dots/opened', {
          method: 'POST', body: { page, ...(matchId === undefined ? {} : { matchId }) },
        });
        if (!current()) return;
        await client.cancelQueries({ queryKey, exact: true });
        if (!current()) return;
        failed = false;
        previous.current = dots[page];
        client.setQueryData(queryKey, dots);
      } catch {
        failed = true;
      } finally {
        opening = false;
        if (pending) {
          pending = false;
          void open();
        }
      }
    };
    const unsubscribe = client.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'success') return;
      if (event.query.queryKey[0] !== NEW_DOTS_QUERY_KEY[0] || event.query.queryKey[1] !== studentId) return;
      const data = event.query.state.data as NewDots | undefined;
      if (data === undefined) return;
      const value = data[page];
      const arrived = previous.current === false && value;
      previous.current = value;
      if (value && (arrived || failed)) void open();
    });
    void open();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [client, studentId, page, matchId, enabled]);
}
