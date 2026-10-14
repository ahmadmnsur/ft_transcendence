import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isValidPassword } from '@shared/limits';
import { ApiProtocolError, ApiRefusalError } from '../api/client';
import { changePassword } from '../api/auth';
import { SESSION_QUERY_KEY, fetchSession, sessionQueryOptions } from '../api/session';
import { Banner, Button, Card, TextField } from '../design';
import { PageTitle } from '../layout';
import { authCopy, authErrorMessage } from '../auth/messages';

const copy = authCopy.passwordChange;

// `/me`: for now it holds only the password-change form under a clear
// heading (§6.1). On success the Student is signed out everywhere, so the
// page clears the session query and returns to `/sign-in` with a notice. Any
// failure other than a refusal re-probes the session first: signed out
// returns with the neutral notice, still signed in stays on the form with
// the failure's sentence (§5.1).
export function MePage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // The hidden username field below carries the signed-in Student's email.
  const { data: session } = useQuery(sessionQueryOptions());
  const username = session?.authenticated === true ? session.student.email : '';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentError, setCurrentError] = useState<string | undefined>(undefined);
  const [newError, setNewError] = useState<string | undefined>(undefined);
  const [confirmError, setConfirmError] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // The status slot renders only while there is a message; once it renders,
  // focus moves to it, as with the field errors above.
  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  function signOutAndGo(
    notice: 'password-changed' | 'password-change-unknown',
  ): Promise<void> {
    queryClient.clear();
    queryClient.setQueryData(SESSION_QUERY_KEY, { authenticated: false });
    return navigate({ to: '/sign-in', search: { notice }, replace: true });
  }

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const nextCurrentError =
      currentPassword === '' ? copy.currentEmpty : isValidPassword(currentPassword) ? undefined : copy.currentInvalid;
    const nextNewError = isValidPassword(newPassword) ? undefined : copy.newInvalid;
    const nextConfirmError =
      nextNewError === undefined && confirmPassword.trim() === newPassword.trim()
        ? undefined
        : copy.confirmInvalid;
    setCurrentError(nextCurrentError);
    setNewError(nextNewError);
    setConfirmError(nextConfirmError);
    setStatus(undefined);
    if (nextCurrentError !== undefined) {
      currentRef.current?.focus();
      return;
    }
    if (nextNewError !== undefined) {
      newRef.current?.focus();
      return;
    }
    if (nextConfirmError !== undefined) {
      confirmRef.current?.focus();
      return;
    }
    setPending(true);
    try {
      await changePassword({ currentPassword: currentPassword.trim(), newPassword: newPassword.trim() });
      await signOutAndGo('password-changed');
    } catch (error) {
      if (error instanceof ApiRefusalError) {
        // A 200 refusal: nothing changed and the Student is still signed in,
        // so the form stays with the refusal's sentence and no probe runs.
        setStatus(authErrorMessage(error.code));
        return;
      }
      // Anything else — a protocol failure, or a dropped connection after a
      // successful update — may have signed the Student out (§5.1 accepts
      // that crash state): the session probe decides. Signed out always
      // takes the neutral notice, since a lost answer may already have set
      // the new password; still signed in, or a failed probe, stays on the
      // form with the failure's sentence.
      let signedOut = true;
      try {
        signedOut = !(await fetchSession()).authenticated;
      } catch {
        signedOut = false;
      }
      if (signedOut) {
        await signOutAndGo('password-change-unknown');
        return;
      }
      setStatus(error instanceof ApiProtocolError ? authErrorMessage(error.code) : authErrorMessage(undefined));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageTitle name={copy.title} />
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-semibold text-ink">{copy.heading}</h1>
        <Card title={copy.cardTitle} subtitle={copy.cardSubtitle} className="mt-4">
          <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-4">
            {status !== undefined ? (
              <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
                <Banner tone="danger" title={status} />
              </div>
            ) : null}
            <input
              type="text"
              autoComplete="username"
              value={username}
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
            />
            <TextField
              ref={currentRef}
              label={copy.currentLabel}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              error={currentError}
            />
            <TextField
              ref={newRef}
              label={copy.newLabel}
              hint={copy.newHint}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              error={newError}
            />
            <TextField
              ref={confirmRef}
              label={copy.confirmLabel}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={confirmError}
            />
            <Button type="submit" loading={pending} className="w-full">
              {pending ? copy.submitting : copy.submit}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
