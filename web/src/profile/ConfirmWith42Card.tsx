import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LIMITS, isValidPassword } from '@shared/limits';
import { ApiRefusalError } from '../api/client';
import { setPassword42, start42 } from '../api/auth';
import { fetchSession } from '../api/session';
import { meQueryOptions } from '../api/profile';
import { Banner, Button, Card, TextField } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from './failure';

// §5.6 C: recovery through Confirm with 42 on `/me`, shown only while a 42
// account is connected. Confirm with 42 hands the browser to 42, the way
// Connect 42 does, and asks for no password; the callback's answer comes
// back as `/me?oauth=confirmed`, which the page passes in as `confirmed`.
// Then the card is the new-password form: set within ten minutes, once, it
// signs the Student out everywhere, like the password change. Any refusal
// means the permission is used or gone, so the card goes back to Confirm
// with 42 with the refusal's sentence.
export function ConfirmWith42Card({
  confirmed,
  onAction,
  onConfirmedEnd,
  onSignedOut,
  className,
}: {
  confirmed: boolean;
  // Called at the start of a Confirm with 42, so the page retires the
  // `/me?oauth=…` notice shown above the cards.
  onAction?: () => void;
  // The permission is used or gone: the page sets `confirmed` back.
  onConfirmedEnd: () => void;
  // Signed out everywhere: the page clears its queries and goes to sign-in.
  onSignedOut: (notice: 'password-changed' | 'password-change-unknown') => Promise<void>;
  className?: string;
}): React.JSX.Element | null {
  const { t, format, errorText } = useI18n();
  const copy = t.profile.confirm42;
  const { data: me } = useQuery(meQueryOptions());
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newError, setNewError] = useState(false);
  const [confirmError, setConfirmError] = useState(false);
  // A new object each time, so the focus effect below runs again for a
  // repeated message.
  const [failure, setFailure] = useState<{ code: unknown } | undefined>(undefined);
  const [pending, setPending] = useState<'confirm' | 'set' | null>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const failureRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const handOffTimerRef = useRef<number | undefined>(undefined);
  const shown = me?.fortyTwoConnected === true;

  const passwordInvalid = format(t.auth.password.invalid, {
    minChars: LIMITS.password.minChars,
    maxBytes: LIMITS.password.maxBytes,
  });

  useEffect(() => {
    if (failure !== undefined) failureRef.current?.focus();
  }, [failure]);

  // Back from 42 with the permission, the form is below the fold: focus
  // moves to its notice, which brings it into view and reads it out.
  useEffect(() => {
    if (shown && confirmed) noticeRef.current?.focus();
  }, [shown, confirmed]);

  // Late responses never act on a page that is gone, and a page restored
  // from the back/forward cache (Back from 42's page) frees the button, as
  // FortyTwoCard does for Connect 42.
  useEffect(() => {
    mountedRef.current = true;
    function onPageShow(event: PageTransitionEvent): void {
      if (!event.persisted) return;
      window.clearTimeout(handOffTimerRef.current);
      setPending(null);
    }
    window.addEventListener('pageshow', onPageShow);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('pageshow', onPageShow);
      window.clearTimeout(handOffTimerRef.current);
    };
  }, []);

  async function onConfirm(): Promise<void> {
    if (pending !== null) return;
    setFailure(undefined);
    onAction?.();
    setPending('confirm');
    try {
      const { authorizeUrl } = await start42('confirm');
      if (!mountedRef.current) return;
      window.location.assign(authorizeUrl);
      window.clearTimeout(handOffTimerRef.current);
      handOffTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) setPending(null);
      }, 5000);
    } catch (error) {
      if (!mountedRef.current) return;
      setFailure({ code: failureCode(error) });
      setPending(null);
    }
  }

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending !== null) return;
    const nextNewError = !isValidPassword(newPassword);
    const nextConfirmError = nextNewError || confirmPassword.trim() !== newPassword.trim();
    setNewError(nextNewError);
    setConfirmError(nextConfirmError);
    setFailure(undefined);
    if (nextNewError) {
      newRef.current?.focus();
      return;
    }
    if (nextConfirmError) {
      confirmRef.current?.focus();
      return;
    }
    setPending('set');
    try {
      await setPassword42(newPassword.trim());
      await onSignedOut('password-changed');
    } catch (error) {
      if (error instanceof ApiRefusalError) {
        // Still signed in, and the permission is used or gone. A lost race
        // answers `password_incorrect`, whose sentence names a password this
        // form never asked for; its remedy is a missing permission's.
        setFailure({ code: error.code === 'password_incorrect' ? 'confirmation_required' : error.code });
        resetForm();
        return;
      }
      // Anything else may have signed the Student out (§5.1): the session
      // probe decides, as on the password change.
      let signedOut = true;
      try {
        signedOut = !(await fetchSession()).authenticated;
      } catch {
        signedOut = false;
      }
      if (signedOut) {
        await onSignedOut('password-change-unknown');
        return;
      }
      setFailure({ code: failureCode(error) });
      resetForm();
    } finally {
      if (mountedRef.current) setPending(null);
    }
  }

  function resetForm(): void {
    setNewPassword('');
    setConfirmPassword('');
    onConfirmedEnd();
  }

  if (!shown) return null;

  return (
    <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2} className={className}>
      <div className="flex min-w-0 flex-col gap-4">
        {failure !== undefined ? (
          <div ref={failureRef} tabIndex={-1} className="rounded-lg focus-ring">
            <Banner tone="danger" title={errorText(failure.code)} />
          </div>
        ) : null}
        {confirmed ? (
          <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-4">
            <div ref={noticeRef} tabIndex={-1} className="rounded-lg focus-ring">
              <Banner tone="success" title={copy.confirmedNotice} />
            </div>
            {/* The hidden username field carries the signed-in Student's
                email, so a password manager saves the right account. */}
            <input
              type="text"
              autoComplete="username"
              value={me.email}
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
            />
            <TextField
              ref={newRef}
              label={t.auth.passwordChange.newLabel}
              hint={format(t.auth.password.hint, {
                minChars: LIMITS.password.minChars,
                maxBytes: LIMITS.password.maxBytes,
              })}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              error={newError ? passwordInvalid : undefined}
            />
            <TextField
              ref={confirmRef}
              label={t.auth.passwordChange.confirmLabel}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={confirmError ? t.auth.passwordChange.confirmInvalid : undefined}
            />
            <Button type="submit" loading={pending === 'set'} className="w-full">
              {pending === 'set' ? copy.submitting : copy.submit}
            </Button>
          </form>
        ) : (
          <Button
            variant="secondary"
            loading={pending === 'confirm'}
            className="w-full"
            onClick={() => void onConfirm()}
          >
            {pending === 'confirm' ? copy.confirming : copy.confirm}
          </Button>
        )}
      </div>
    </Card>
  );
}
