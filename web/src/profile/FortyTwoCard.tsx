import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LIMITS, isValidPassword } from '@shared/limits';
import { disconnect42, start42 } from '../api/auth';
import { ME_QUERY_KEY, meQueryOptions, type OwnProfile } from '../api/profile';
import { Banner, Button, Card, PasswordField } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from './failure';
import { PendingCardBody } from './PendingCardBody';

// What the status Banner says, kept as what happened rather than as a text,
// so it follows a language switch. A new object each time, so the focus
// effect below runs again for a repeated message.
type Status = { kind: 'disconnected' } | { kind: 'failed'; code: unknown };

// §5.6 A step 2, §5.6 B: Connect 42 and Disconnect 42 on the profile page.
// Both ask for the current password, checked at the same shared validators;
// the throttle stays at the boundary. Connect starts the flow and hands the
// browser to 42, the way sign-in's button does: the answer comes back as
// the SPA route `/me?oauth=…`, which the page shows. Disconnect answers at
// once.
export function FortyTwoCard({
  onAction,
}: {
  // Called at the start of a submit that passed client validation, so the
  // page retires the `/me?oauth=…` notice shown above the cards.
  onAction?: () => void;
}): React.JSX.Element {
  const { t, format, errorText } = useI18n();
  const copy = t.profile.fortyTwo;
  const queryClient = useQueryClient();
  const { data: me, isError } = useQuery(meQueryOptions());
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<'empty' | 'invalid' | undefined>(undefined);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  // One action at a time: the two buttons share the slot.
  const [pending, setPending] = useState<'connect' | 'disconnect' | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const handOffTimerRef = useRef<number | undefined>(undefined);

  const passwordInvalid = format(t.auth.password.invalid, {
    minChars: LIMITS.password.minChars,
    maxBytes: LIMITS.password.maxBytes,
  });

  // The status slot renders only while there is a message; once it renders,
  // focus moves to it, as with the field errors above.
  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  // Late responses never act on a page that is gone: a connect start that
  // resolves after the user left cannot yank the browser away.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // The page can come back with the slot still taken: restored from the
  // back/forward cache (Back from 42's page), or never left at all when the
  // navigation was cancelled (Esc, Stop), which fires no event. A restored
  // page also resumes the hand-off timer, so it is cleared here: left
  // running, it would free the slot under the next action.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent): void {
      if (!event.persisted) return;
      window.clearTimeout(handOffTimerRef.current);
      setPending(null);
    }
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.clearTimeout(handOffTimerRef.current);
    };
  }, []);

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending !== null) return;
    const nextPasswordError: 'empty' | 'invalid' | undefined =
      password === '' ? 'empty' : isValidPassword(password) ? undefined : 'invalid';
    setPasswordError(nextPasswordError);
    setStatus(undefined);
    if (nextPasswordError !== undefined) {
      passwordRef.current?.focus();
      return;
    }
    // The submit passed validation, so the Student is acting on the card:
    // the page's `oauth` notice is the last callback's outcome and goes.
    onAction?.();
    if (me === undefined) return;
    if (me.fortyTwoConnected) {
      // Whose profile this submit acted on, captured now: a sign-out and
      // sign-in while the request is in flight must not patch another
      // Student's cache slot.
      const meId = me.id;
      setPending('disconnect');
      try {
        await disconnect42(password.trim());
        if (!mountedRef.current) {
          // Invalidate alone is not enough while the query has no data
          // yet: the read in flight is reused as-is, and its success
          // clears the invalidation, so a read started before the
          // Disconnect could still land `fortyTwoConnected: true`. The
          // cancel drops it (an initial read reverts to `pending` with
          // nothing fetching), then the invalidation refetches every
          // active `GET /api/me` query with a fresh request, so nothing
          // is stranded and no read from before the Disconnect can land.
          await queryClient.cancelQueries({ queryKey: ME_QUERY_KEY });
          void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
          return;
        }
        // A `GET /api/me` still in flight read the profile before this
        // write; cancelling it keeps its older answer from landing over
        // this one (§6.2, as the details card's save does).
        await queryClient.cancelQueries({ queryKey: ME_QUERY_KEY });
        // §6.2: the answer is `{}`, so the cached own profile is patched
        // with the flag alone, and only when it still belongs to the
        // Student this submit captured.
        queryClient.setQueryData<OwnProfile>(ME_QUERY_KEY, (cached) =>
          cached === undefined || cached.id !== meId
            ? cached
            : { ...cached, fortyTwoConnected: false },
        );
        if (mountedRef.current) {
          setPassword('');
          setStatus({ kind: 'disconnected' });
        }
      } catch (error) {
        if (mountedRef.current) setStatus({ kind: 'failed', code: failureCode(error) });
      } finally {
        setPending(null);
      }
      return;
    }
    // Connect: start the flow against the current password; the boundary
    // counts a refusal under this Student's own email (§5.5). Success hands
    // the browser to 42; the button stays pending while the page unloads.
    setPending('connect');
    try {
      const { authorizeUrl } = await start42('link', password.trim());
      if (!mountedRef.current) return;
      window.location.assign(authorizeUrl);
      window.clearTimeout(handOffTimerRef.current);
      handOffTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) setPending(null);
      }, 5000);
    } catch (error) {
      if (!mountedRef.current) return;
      setStatus({ kind: 'failed', code: failureCode(error) });
      setPending(null);
    }
  }

  // §6.2: the card shell shows at once. While the profile read is pending the
  // body says so and reserves the loaded height; a failed read leaves the
  // body empty, since `/me` shows the failure once above the cards.
  if (me === undefined) {
    return (
      <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
        <PendingCardBody failed={isError} reserveClassName="min-h-64" />
      </Card>
    );
  }

  return (
    <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-4">
        {status !== undefined ? (
          <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
            {status.kind === 'disconnected' ? (
              <Banner tone="success" title={copy.disconnectedNotice} />
            ) : (
              <Banner tone="danger" title={errorText(status.code)} />
            )}
          </div>
        ) : null}
        {/* The hidden username field carries the signed-in Student's email,
            like MePage's password form's, so a password manager fills the
            right account. */}
        <input
          type="text"
          autoComplete="username"
          value={me.email}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
        <p className="text-sm text-ink-muted">{me.fortyTwoConnected ? copy.connected : copy.notConnected}</p>
        <PasswordField
          ref={passwordRef}
          label={t.auth.passwordChange.currentLabel}
          {...t.auth.passwordVisibility}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={
            passwordError === undefined
              ? undefined
              : passwordError === 'empty'
                ? t.auth.passwordChange.currentEmpty
                : passwordInvalid
          }
        />
        {me.fortyTwoConnected ? (
          <Button
            type="submit"
            loading={pending === 'disconnect'}
            aria-disabled={pending === 'connect' || undefined}
            className="w-full"
          >
            {pending === 'disconnect' ? copy.disconnecting : copy.disconnect}
          </Button>
        ) : (
          <Button
            type="submit"
            loading={pending === 'connect'}
            aria-disabled={pending === 'disconnect' || undefined}
            className="w-full"
          >
            {pending === 'connect' ? copy.connecting : copy.connect}
          </Button>
        )}
      </form>
    </Card>
  );
}
