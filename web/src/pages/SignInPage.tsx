import { useEffect, useRef, useState } from 'react';
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LIMITS, isValidEmail, isValidPassword, normalizeEmail } from '@shared/limits';
import { ApiProtocolError, ApiRefusalError } from '../api/client';
import { login, start42 } from '../api/auth';
import { configQueryOptions } from '../api/config';
import { SESSION_QUERY_KEY } from '../api/session';
import { Banner, Button, Card, PasswordField, TextField } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';

// The code a failed sign-in carries, or undefined when the response is not
// the envelope; the text is read while rendering, so a switch re-renders it.
function failureCode(error: unknown): unknown {
  if (error instanceof ApiRefusalError) return error.code;
  if (error instanceof ApiProtocolError) return error.code;
  return undefined;
}

const signInSearch = getRouteApi('/sign-in');

// §3.5.1: the signed-out sign-in page. On success it refreshes the session
// query and goes to `/`. Each refusal shows its own sentence, picked by code;
// the server's message is never displayed.
export function SignInPage(): React.JSX.Element {
  const { t, format, errorText } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { notice, oauth } = signInSearch.useSearch();
  // §5.6 A: the 42 button appears only when the config says 42 is enabled;
  // while the probe runs, or when it failed, no button renders.
  const config = useQuery(configQueryOptions());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState<'empty' | 'invalid' | undefined>(undefined);
  // A refusal's code, or 42's failure notice, which has no code.
  const [status, setStatus] = useState<{ code: unknown } | 'oauth-failed' | undefined>(undefined);
  // One authentication action at a time: the password form and the 42 button
  // share this slot, so neither can start while the other runs.
  const [pending, setPending] = useState<'password' | 'oauth' | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const handOffTimerRef = useRef<number | undefined>(undefined);

  const passwordInvalid = format(t.auth.password.invalid, {
    minChars: LIMITS.password.minChars,
    maxBytes: LIMITS.password.maxBytes,
  });

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

  // §5.6 A's failure path arrives as `?oauth=failed`, and a Removed or
  // Suspended Student by the 42 id as `oauth=removed`/`oauth=suspended`
  // (§5.6 B): show its one message for this visit, then take only `oauth`
  // out of the URL by replacing the history entry — the validated `notice`
  // and the hash stay — so a refresh of the cleaned URL never repeats it.
  // The message lives in the status slot, which a retry clears; a later
  // `oauth` delivered to this route sets it again.
  useEffect(() => {
    if (oauth === undefined) return;
    setStatus(
      oauth === 'failed'
        ? 'oauth-failed'
        : { code: oauth === 'removed' ? 'account_removed' : 'account_suspended' },
    );
    void navigate({ to: '/sign-in', search: { notice }, hash: true, replace: true }).catch(() => {
      // The URL stays as it is if the replacement fails; the message shows.
    });
  }, [oauth, notice, navigate]);

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending !== null) return;
    const nextEmailError = !isValidEmail(email);
    const nextPasswordError: 'empty' | 'invalid' | undefined =
      password === '' ? 'empty' : isValidPassword(password) ? undefined : 'invalid';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setStatus(undefined);
    if (nextEmailError) {
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
      if (mountedRef.current) setStatus({ code: failureCode(error) });
    } finally {
      setPending(null);
    }
  }

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
      window.clearTimeout(handOffTimerRef.current);
      handOffTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) setPending(null);
      }, 5000);
    } catch (error) {
      if (!mountedRef.current) return;
      setStatus({ code: failureCode(error) });
      setPending(null);
    }
  }

  return (
    <>
      <PageTitle name={t.auth.signIn.title} />
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-semibold text-ink">{t.auth.signIn.heading}</h1>
        <div className="mt-4 flex min-w-0 flex-col gap-4">
          {notice === 'password-changed' ? (
            <Banner tone="success" title={t.auth.signIn.noticePasswordChanged} />
          ) : null}
          {notice === 'password-change-unknown' ? (
            <Banner tone="warning" title={t.auth.signIn.noticeSignedOutUnknown} />
          ) : null}
          <Card>
            <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-4">
              {status !== undefined ? (
                <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
                  <Banner
                    tone="danger"
                    title={status === 'oauth-failed' ? t.auth.signIn.oauthFailed : errorText(status.code)}
                  />
                </div>
              ) : null}
              <TextField
                ref={emailRef}
                label={t.auth.signIn.emailLabel}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={emailError ? t.auth.signIn.emailInvalid : undefined}
              />
              <PasswordField
                ref={passwordRef}
                label={t.auth.signIn.passwordLabel}
                {...t.auth.passwordVisibility}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={passwordError === undefined ? undefined : passwordError === 'empty' ? t.auth.signIn.passwordEmpty : passwordInvalid}
              />
              <Button
                type="submit"
                loading={pending === 'password'}
                aria-disabled={pending === 'oauth' || undefined}
                className="w-full"
              >
                {pending === 'password' ? t.auth.signIn.submitting : t.auth.signIn.submit}
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
              {t.auth.signIn.oauthButton}
            </Button>
          ) : null}
          <p className="text-center text-sm text-ink-muted">
            {format(t.auth.signIn.noAccount, {
              link: (
                <Link to="/sign-up" className="rounded text-link underline underline-offset-2 focus-ring">
                  {t.auth.signIn.signUpLink}
                </Link>
              ),
            })}
          </p>
        </div>
      </div>
    </>
  );
}
