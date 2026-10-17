import { useEffect, useRef, useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchConfig } from '../api/config';
import { fetchSession, sessionQueryOptions, setSignedOut } from '../api/session';
import { Banner } from '../design';
import { realtimeCopy } from './messages';
import { socket } from './socket';

// §7.5: after a transport failure the page pauses Socket.IO's own retry loop,
// probes over HTTP, and resumes with a delay. These are the bounds the client
// is configured with (§7.1), so the resumed loop keeps the same curve.
const BACKOFF_START_MS = 1000;
const BACKOFF_CAP_MS = 10_000;

// The shell's socket lifecycle (§7.5, M27). Mounted once, inside the root
// layout: it connects the client of `socket.ts` once GET /api/session reports
// a session, tells the three terminal outcomes from an outage, and shows the
// origin banner. Events themselves belong to the tickets that own the
// surfaces (#46, #47, #61); this component only keeps the connection honest.
export function RealtimeConnection(): React.JSX.Element | null {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
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
  const probingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(BACKOFF_START_MS);

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

    // §7.5: an Origin refusal is indistinguishable from an outage in the
    // browser, so both probes decide. The two HTTP calls are not origin-gated;
    // unlike the socket, they reach the server and their answers separate the
    // three outcomes.
    async function probeTransportFailure(): Promise<void> {
      if (probingRef.current) return;
      probingRef.current = true;
      try {
        let config;
        try {
          config = await fetchConfig();
        } catch {
          // Nothing answers: a network or server outage. Try again later.
          scheduleReconnect();
          return;
        }
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
          scheduleReconnect();
          return;
        }
        if (!probed.authenticated) {
          await goToSignIn();
          return;
        }
        scheduleReconnect();
      } finally {
        probingRef.current = false;
      }
    }

    // §7.5: a forced disconnect never reconnects on its own. The probe says
    // which revocation it was; a session that survived (force applied to
    // another session) may reconnect.
    async function probeForcedDisconnect(): Promise<void> {
      if (probingRef.current) return;
      probingRef.current = true;
      try {
        let probed;
        try {
          probed = await fetchSession();
        } catch {
          scheduleReconnect();
          return;
        }
        if (!probed.authenticated) {
          await goToSignIn();
          return;
        }
        if (stoppedRef.current) return;
        socket.connect();
      } finally {
        probingRef.current = false;
      }
    }

    function onConnect(): void {
      backoffRef.current = BACKOFF_START_MS;
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
      socket.disconnect();
    };
  }, [queryClient]);

  // §7.1: connected only after GET /api/session reports a session, and gone
  // the moment it stops. The disconnect before the connect forces a fresh
  // handshake, so the new connection carries the cookie of the account
  // signed in now, never a stale one.
  useEffect(() => {
    if (studentId === null) {
      firstConnectRef.current = false;
      stoppedRef.current = false;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      socket.disconnect();
      return;
    }
    firstConnectRef.current = true;
    stoppedRef.current = false;
    backoffRef.current = BACKOFF_START_MS;
    setOriginRefused(false);
    socket.disconnect();
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [studentId]);

  if (!originRefused) return null;
  return (
    <div className="mb-4">
      <Banner tone="danger" title={realtimeCopy.originRefused.title} body={realtimeCopy.originRefused.body} />
    </div>
  );
}
