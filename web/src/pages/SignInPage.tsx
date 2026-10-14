import { useEffect, useRef, useState } from 'react';
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { isValidEmail, isValidPassword, normalizeEmail } from '@shared/limits';
import { ApiProtocolError, ApiRefusalError } from '../api/client';
import { login } from '../api/auth';
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
  const { notice } = signInSearch.useSearch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // The status slot renders only while there is a message; once it renders,
  // focus moves to it, as with the field errors below.
  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending) return;
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
    setPending(true);
    try {
      const student = await login({ email: normalizeEmail(email), password: password.trim() });
      queryClient.setQueryData(SESSION_QUERY_KEY, { authenticated: true, student });
      await navigate({ to: '/' });
    } catch (error) {
      setStatus(failureMessage(error));
    } finally {
      setPending(false);
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
              <Button type="submit" loading={pending} className="w-full">
                {pending ? copy.submitting : copy.submit}
              </Button>
            </form>
          </Card>
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
