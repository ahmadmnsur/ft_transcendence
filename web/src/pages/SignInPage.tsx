import { useEffect, useRef, useState } from 'react';
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isValidEmail, isValidPassword, normalizeEmail } from '@shared/limits';
import { ApiProtocolError, ApiRefusalError } from '../api/client';
import { login, start42 } from '../api/auth';
import { configQueryOptions } from '../api/config';
import { SESSION_QUERY_KEY } from '../api/session';
import { Banner, Button, Card, TextField } from '../design';
import { PageTitle } from '../layout';
import { authCopy, authErrorMessage } from '../auth/messages';

const copy = authCopy.signIn;

function failureMessage(error: unknown): string {
  if (error instanceof ApiRefusalError) return authErrorMessage(error.code);
  if (error instanceof ApiProtocolError) return authErrorMessage(error.code);
  return authErrorMessage(undefined);
}

const signInSearch = getRouteApi('/sign-in');

// §3.5.1: the signed-out sign-in page. On success it refreshes the session
// query and goes to `/`. Each refusal shows its own sentence, picked by code;
// the server's message is never displayed.
export function SignInPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { notice, oauth } = signInSearch.useSearch();
  // §5.6 A: the 42 button appears only when the config says 42 is enabled;
  // while the probe runs, or when it failed, no button renders.
  const config = useQuery(configQueryOptions());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  // One authentication action at a time: the password form and the 42 button
  // share this slot, so neither can start while the other runs.
  const [pending, setPending] = useState<'password' | 'oauth' | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  // The status slot renders only while there is a message; once it renders,
  // focus moves to it, as with the field errors below.
  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  // Late responses never act on a page that is gone: a 42 start that
  // resolves after the user left cannot yank the browser away, and a
  // password sign-in cannot navigate from a dead page.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending !== null) return;
    const nextEmailError = isValidEmail(email) ? undefined : copy.emailInvalid;
    const nextPasswordError =
      password === '' ? copy.passwordEmpty : isValidPassword(password) ? undefined : copy.passwordInvalid;
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setStatus(undefined);
    if (nextEmailError !== undefined) {
      emailRef.current?.focus();
      return;
    }
    if (nextPasswordError !== undefined) {
      passwordRef.current?.focus();
      return;
    }
    setPending('password');
    try {
      const student = await login({ email: normalizeEmail(email), password: password.trim() });
      if (!mountedRef.current) return;
      queryClient.setQueryData(SESSION_QUERY_KEY, { authenticated: true, student });
      await navigate({ to: '/' });
    } catch (error) {
      if (mountedRef.current) setStatus(failureMessage(error));
    } finally {
      setPending(null);
    }
  }

  // §5.6 A: start the 42 flow and hand the browser to 42. Sharing the one
  // pending slot with the form means no start can run beside a sign-in; the
  // button stays pending while the page unloads, and a failed start shows
  // the same status slot a failed sign-in uses.
  async function onOauthStart(): Promise<void> {
    if (pending !== null) return;
    setPending('oauth');
    setStatus(undefined);
    try {
      const { authorizeUrl } = await start42('sign_in');
      if (!mountedRef.current) return;
      window.location.assign(authorizeUrl);
    } catch (error) {
      if (!mountedRef.current) return;
      setStatus(failureMessage(error));
      setPending(null);
    }
  }

  return (
    <>
      <PageTitle name={copy.title} />
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-semibold text-ink">{copy.heading}</h1>
        <div className="mt-4 flex min-w-0 flex-col gap-4">
          {notice === 'password-changed' ? (
            <Banner tone="success" title={copy.noticePasswordChanged} />
          ) : null}
          {notice === 'password-change-unknown' ? (
            <Banner tone="warning" title={copy.noticeSignedOutUnknown} />
          ) : null}
          {oauth === 'failed' ? <Banner tone="danger" title={copy.oauthFailed} /> : null}
          <Card>
            <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-4">
              {status !== undefined ? (
                <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
                  <Banner tone="danger" title={status} />
                </div>
              ) : null}
              <TextField
                ref={emailRef}
                label={copy.emailLabel}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={emailError}
              />
              <TextField
                ref={passwordRef}
                label={copy.passwordLabel}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={passwordError}
              />
              <Button
                type="submit"
                loading={pending === 'password'}
                aria-disabled={pending === 'oauth' || undefined}
                className="w-full"
              >
                {pending === 'password' ? copy.submitting : copy.submit}
              </Button>
            </form>
          </Card>
          {config.data?.oauth42Enabled === true ? (
            <Button
              variant="secondary"
              className="w-full"
              loading={pending === 'oauth'}
              aria-disabled={pending === 'password' || undefined}
              onClick={() => void onOauthStart()}
            >
              {copy.oauthButton}
            </Button>
          ) : null}
          <p className="text-center text-sm text-ink-muted">
            {copy.noAccountCta}{' '}
            <Link to="/sign-up" className="rounded text-link underline underline-offset-2 focus-ring">
              {copy.signUpLink}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
