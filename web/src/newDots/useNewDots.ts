import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { NEW_DOT_KEYS, type NewDotKey } from '@shared/new-dots';
import { NEW_DOTS_QUERY_KEY, newDotsQueryOptions, postOpenedPage, type NewDots } from '../api/new-dots';
import { SESSION_QUERY_KEY, sessionQueryOptions, type SessionValue } from '../api/session';

const EMPTY_DOTS = Object.fromEntries(NEW_DOT_KEYS.map((key) => [key, false])) as NewDots;

type OpenedPageOptions = { matchId?: string; enabled?: boolean; refresh?: unknown };

export function readNewDotsAgain(client: QueryClient): void {
  void client.invalidateQueries({ queryKey: NEW_DOTS_QUERY_KEY });
}

export function useNewDots(): NewDots {
  const { data: session } = useQuery(sessionQueryOptions());
  const studentId = session?.authenticated === true ? session.student.id : null;
  const { data } = useQuery(newDotsQueryOptions(studentId));
  return studentId === null ? EMPTY_DOTS : data ?? EMPTY_DOTS;
}

export function useOpenedPage(page: NewDotKey, { matchId, enabled = true, refresh }: OpenedPageOptions = {}): void {
  const client = useQueryClient();
  const { data: session } = useQuery(sessionQueryOptions());
  const studentId = session?.authenticated === true ? session.student.id : null;
  const previous = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (!enabled || studentId === null) return;
    const queryKey = newDotsQueryOptions(studentId).queryKey;
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
        const dots = await postOpenedPage(page, matchId);
        if (!current()) return;
        await client.cancelQueries({ queryKey, exact: true });
        if (!current()) return;
        failed = false;
        previous.current = dots[page];
        client.setQueryData(queryKey, dots);
        void client.invalidateQueries({ queryKey, exact: true });
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
  }, [client, studentId, page, matchId, enabled, refresh]);
}
