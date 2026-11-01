import { useEffect, useRef, useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchConfig } from '../api/config';
import { SESSION_QUERY_KEY, fetchSession, sessionQueryOptions, setSignedOut } from '../api/session';
import { Banner } from '../design';
import { useI18n } from '../i18n/context';
import { socket } from './socket';

const BACKOFF_START_MS = 1000;
const BACKOFF_CAP_MS = 10_000;

export function RealtimeConnection({ brand }: { brand: string }): React.JSX.Element | null {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const { t, formatText } = useI18n();
  const { data: session } = useQuery(sessionQueryOptions());
  const studentId = session?.authenticated === true ? session.student.id : null;
  const [originRefused, setOriginRefused] = useState(false);

  const navigateRef = useRef(navigate);
  const routerRef = useRef(router);
  const firstConnectRef = useRef(false);
  const stoppedRef = useRef(false);
  const probingGenerationRef = useRef<number | null>(null);
  const sessionGenerationRef = useRef(0);
  const sessionStudentIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(BACKOFF_START_MS);
  const stableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    navigateRef.current = navigate;
    routerRef.current = router;
  }, [navigate, router]);

  useEffect(() => {
    function clearTimer(): void {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function clearStableTimer(): void {
      if (stableTimerRef.current !== null) {
        clearTimeout(stableTimerRef.current);
        stableTimerRef.current = null;
      }
    }

    function scheduleReconnect(): void {
      if (stoppedRef.current || timerRef.current !== null) return;
      const delay = backoffRef.current;
      backoffRef.current = Math.min(delay * 2, BACKOFF_CAP_MS);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (stoppedRef.current) return;
        socket.connect();
      }, delay);
    }

    async function goToSignIn(): Promise<void> {
      stoppedRef.current = true;
      clearTimer();
      setSignedOut(queryClient);
      if (routerRef.current.latestLocation.pathname === '/sign-in') return;
      await navigateRef.current({ to: '/sign-in', replace: true });
    }

    function generationChanged(generation: number): boolean {
      return generation !== sessionGenerationRef.current;
    }

    async function probeTransportFailure(): Promise<void> {
      const generation = sessionGenerationRef.current;
      const studentIdAtStart = sessionStudentIdRef.current;
      if (probingGenerationRef.current === generation) return;
      probingGenerationRef.current = generation;
      try {
        let config;
        try {
          config = await fetchConfig();
        } catch {
          if (generationChanged(generation)) return;
          scheduleReconnect();
          return;
        }
        if (generationChanged(generation)) return;
        if (window.location.origin !== config.publicOrigin) {
          stoppedRef.current = true;
          setOriginRefused(true);
          return;
        }
        let probed;
        try {
          probed = await fetchSession();
        } catch {
          if (generationChanged(generation)) return;
          scheduleReconnect();
          return;
        }
        if (generationChanged(generation)) return;
        if (!probed.authenticated) {
          await goToSignIn();
          return;
        }
        if (probed.student.id !== studentIdAtStart) {
          queryClient.setQueryData(SESSION_QUERY_KEY, probed);
          return;
        }
        scheduleReconnect();
      } finally {
        if (probingGenerationRef.current === generation) probingGenerationRef.current = null;
      }
    }

    async function probeForcedDisconnect(): Promise<void> {
      const generation = sessionGenerationRef.current;
      const studentIdAtStart = sessionStudentIdRef.current;
      if (probingGenerationRef.current === generation) return;
      probingGenerationRef.current = generation;
      try {
        let probed;
        try {
          probed = await fetchSession();
        } catch {
          if (generationChanged(generation)) return;
          scheduleReconnect();
          return;
        }
        if (generationChanged(generation)) return;
        if (!probed.authenticated) {
          await goToSignIn();
          return;
        }
        if (probed.student.id !== studentIdAtStart) {
          queryClient.setQueryData(SESSION_QUERY_KEY, probed);
          return;
        }
        scheduleReconnect();
      } finally {
        if (probingGenerationRef.current === generation) probingGenerationRef.current = null;
      }
    }

    function onConnect(): void {
      clearStableTimer();
      stableTimerRef.current = setTimeout(() => {
        stableTimerRef.current = null;
        backoffRef.current = BACKOFF_START_MS;
      }, BACKOFF_CAP_MS);
      setOriginRefused(false);
      if (firstConnectRef.current) {
        firstConnectRef.current = false;
        return;
      }
      void queryClient.invalidateQueries();
    }

    function onConnectError(error: Error): void {
      if (stoppedRef.current) return;
      if (error.message === 'unauthorized') {
        void goToSignIn();
        return;
      }
      socket.disconnect();
      void probeTransportFailure();
    }

    function onDisconnect(reason: string): void {
      clearStableTimer();
      if (reason === 'io server disconnect') void probeForcedDisconnect();
    }

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      clearTimer();
      clearStableTimer();
      socket.disconnect();
    };
  }, [queryClient]);

  useEffect(() => {
    const generation = ++sessionGenerationRef.current;
    sessionStudentIdRef.current = studentId;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (studentId === null) {
      firstConnectRef.current = false;
      stoppedRef.current = false;
      socket.disconnect();
      return;
    }
    firstConnectRef.current = true;
    stoppedRef.current = false;
    backoffRef.current = BACKOFF_START_MS;
    setOriginRefused(false);

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function confirmSessionAndConnect(): Promise<void> {
      for (;;) {
        try {
          const probed = await queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 });
          if (cancelled || generation !== sessionGenerationRef.current) return;
          if (!probed.authenticated || probed.student.id !== studentId) return;
          socket.disconnect();
          socket.connect();
          return;
        } catch {
          if (cancelled || generation !== sessionGenerationRef.current) return;
          const delay = backoffRef.current;
          backoffRef.current = Math.min(delay * 2, BACKOFF_CAP_MS);
          await new Promise<void>((resolve) => {
            retryTimer = setTimeout(resolve, delay);
          });
          retryTimer = null;
          if (cancelled || generation !== sessionGenerationRef.current) return;
        }
      }
    }
    void confirmSessionAndConnect();

    return () => {
      cancelled = true;
      if (retryTimer !== null) clearTimeout(retryTimer);
      socket.disconnect();
    };
  }, [studentId, queryClient]);

  if (!originRefused) return null;
  return (
    <div className="mb-4">
      <Banner
        tone="danger"
        title={formatText(t.shell.originRefused.title, { brand })}
        body={formatText(t.shell.originRefused.body, { brand })}
      />
    </div>
  );
}
