import { useEffect, useRef, useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchConfig } from '../api/config';
import { SESSION_QUERY_KEY, fetchSession, sessionQueryOptions, setSignedOut } from '../api/session';
import { Banner } from '../design';
import { useI18n } from '../i18n/context';
import { socket } from './socket';

// §7.5: after a transport failure the page pauses Socket.IO's own retry loop,
// probes over HTTP, and resumes with a delay. These are the bounds the client
// is configured with (§7.1), so the resumed loop keeps the same curve.
const BACKOFF_START_MS = 1000;
const BACKOFF_CAP_MS = 10_000;

// The shell's socket lifecycle (§7.5, M27). Mounted once, inside the root
// layout: it connects the client of `socket.ts` once GET /api/session reports
// a session, tells the three terminal outcomes from an outage, and shows the
// origin banner. Events themselves belong to the surfaces that own them
// (`social/PresenceUpdates.tsx`, `messages/MessageUpdates.tsx`,
// `matching/RoundUpdates.tsx`, `feed/FeedUpdates.tsx` and
// `progress/ProgressCard.tsx`); this component only keeps the connection honest.
export function RealtimeConnection({ brand }: { brand: string }): React.JSX.Element | null {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const { t, formatText } = useI18n();
  const { data: session } = useQuery(sessionQueryOptions());
  const studentId = session?.authenticated === true ? session.student.id : null;
  const [originRefused, setOriginRefused] = useState(false);

  // The listeners are registered once, for the component's lifetime, so every
  // value they read whose identity can change lives in a ref.
  const navigateRef = useRef(navigate);
  const routerRef = useRef(router);
  // The first connect after a sign-in is not a reconnect: it does not
  // invalidate queries, because the pages have just made their own fetches.
  const firstConnectRef = useRef(false);
  // A terminal outcome (sign-in route, origin banner) stops the retry loop
  // until the next sign-in.
  const stoppedRef = useRef(false);
  // The generation allowed to probe, or null. A hung probe from an older
  // session must not block the probe of the Student signed in now (§7.5).
  const probingGenerationRef = useRef<number | null>(null);
  // Incremented every time the signed-in Student changes. A probe captures
  // it at its start and drops every awaited result once it no longer
  // matches, so a late result never acts on the Student signed in now.
  const sessionGenerationRef = useRef(0);
  // The signed-in Student of the current generation, kept beside it. A probe
  // captures both at its start, so an answer that names a different Student
  // is another tab's sign-in, not the Student this tab shows (§7.5).
  const sessionStudentIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(BACKOFF_START_MS);
  // Pending while a new connection has not yet lasted BACKOFF_CAP_MS. Only a
  // connection that lasts resets the backoff, so a server that drops each
  // connection right after accepting it is retried on the same curve.
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

    // §7.5's "resume reconnection with backoff", owned here: a failed probe
    // schedules one attempt, doubling the delay up to the cap.
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

    // §7.5: the terminal session outcome. Clear the signed-in Student's
    // cached state, then let the guard take the /sign-in route. When the
    // router is already there, leave it alone: the page that put it there
    // carries the notice (`MePage`'s `?notice=password-changed`), and this
    // replace would drop it. The latest location is read, not the committed
    // one, so a notice-bearing navigation still in its `beforeLoad` counts.
    async function goToSignIn(): Promise<void> {
      stoppedRef.current = true;
      clearTimer();
      setSignedOut(queryClient);
      if (routerRef.current.latestLocation.pathname === '/sign-in') return;
      await navigateRef.current({ to: '/sign-in', replace: true });
    }

    // §7.5: a probe acts only for the Student it started for; every awaited
    // result is checked against the generation captured at its start, and a
    // stale result is dropped without doing anything.
    function generationChanged(generation: number): boolean {
      return generation !== sessionGenerationRef.current;
    }

    // §7.5: an Origin refusal is indistinguishable from an outage in the
    // browser, so both probes decide. The two HTTP calls are not origin-gated;
    // unlike the socket, they reach the server and their answers separate the
    // three outcomes.
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
          // Nothing answers: a network or server outage. Try again later.
          scheduleReconnect();
          return;
        }
        if (generationChanged(generation)) return;
        // The server's own gate predicate (§7.2 step 1): while it holds, every
        // retry would be refused, so the banner is terminal and there is no
        // retry to schedule.
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
        // §7.5, §4.6: another tab may have signed this Student out and a
        // different Student in — the cookie is shared. That answer names the
        // Student signed in now, not the one this probe started for: install
        // it instead of reconnecting as them. `RootLayout` drops the previous
        // Student's caches on every such switch (the email of §4.6 among
        // them); the session change re-runs the effect below, which probes
        // again and connects for the new Student.
        if (probed.student.id !== studentIdAtStart) {
          queryClient.setQueryData(SESSION_QUERY_KEY, probed);
          return;
        }
        scheduleReconnect();
      } finally {
        if (probingGenerationRef.current === generation) probingGenerationRef.current = null;
      }
    }

    // §7.5: a forced disconnect never reconnects on its own. The probe says
    // which revocation it was. A session still signed in means the gateway's
    // own connect step failed (or another tab signed in again), so the retry
    // takes the outage's backoff.
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
        // §7.5, §4.6: another tab may have signed this Student out and a
        // different Student in — the cookie is shared. Install that session
        // instead of reconnecting as them; `RootLayout` drops the previous
        // Student's caches on every such switch, and the session change
        // re-runs the effect below for the new Student.
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
      // §7.5: after any reconnect, every query is invalidated, so events
      // missed while disconnected come back by refetching.
      void queryClient.invalidateQueries();
    }

    function onConnectError(error: Error): void {
      if (stoppedRef.current) return;
      if (error.message === 'unauthorized') {
        // §7.5: terminal. The CONNECT_ERROR packet already stopped the
        // manager; clear the data and leave for /sign-in.
        void goToSignIn();
        return;
      }
      // An engine failure (an Origin refusal looks like this): pause the
      // manager's retry loop and probe before deciding anything.
      socket.disconnect();
      void probeTransportFailure();
    }

    function onDisconnect(reason: string): void {
      clearStableTimer();
      // §7.5: only a server-side disconnect (revokeSessions) probes; a
      // transport drop reconnects through the client's own loop, and our own
      // disconnects are not news.
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

  // §7.1: connected only after GET /api/session reports a session, and gone
  // the moment it stops. Every change of the signed-in Student is a new
  // generation: probes and reconnect timers of the old one stop at their
  // next check, and its timer is dropped here (§7.5). The disconnect before
  // the connect forces a fresh handshake, so the new connection carries the
  // cookie of the account signed in now, never a stale one.
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

    // §7.1: the sign-in and sign-up pages seed the query from their POST
    // response, so the cached value alone is not proof of a session: a fresh
    // GET must report this same Student before the socket connects.
    // `staleTime: 0` forces it and shares the route guard's in-flight request
    // (`guards.ts`). An outage retries this check on the probe path's own
    // backoff (§7.5), so a sign-in during one still connects once the server
    // answers; a generation change stops the check.
    async function confirmSessionAndConnect(): Promise<void> {
      for (;;) {
        try {
          const probed = await queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 });
          if (cancelled || generation !== sessionGenerationRef.current) return;
          // The answer is now the query's data, so a signed-out one re-runs
          // this effect's signed-out branch and another Student's id re-runs
          // it for that Student; either way this generation does not connect.
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
