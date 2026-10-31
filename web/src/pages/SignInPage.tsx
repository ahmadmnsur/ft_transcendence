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

function failureCode(error: unknown): unknown {
  if (error instanceof ApiRefusalError) return error.code;
  if (error instanceof ApiProtocolError) return error.code;
  return undefined;
}

function signInFailureCode(code: unknown): unknown {
  return code === 'password_incorrect' ? 'no_account' : code;
}

const signInSearch = getRouteApi('/sign-in');

export function SignInPage(): React.JSX.Element {
  const { t, format, errorText } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { notice, oauth } = signInSearch.useSearch();
  const config = useQuery(configQueryOptions());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState<'empty' | 'invalid' | undefined>(undefined);
  const [status, setStatus] = useState<{ code: unknown } | 'oauth-failed' | undefined>(undefined);
  const [pending, setPending] = useState<'password' | 'oauth' | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const handOffTimerRef = useRef<number | undefined>(undefined);

  const passwordInvalid = format(t.auth.password.invalid, { count: LIMITS.password.minChars });

  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (oauth === undefined) return;
    setStatus(
      oauth === 'failed'
        ? 'oauth-failed'
        : { code: oauth === 'removed' ? 'account_removed' : 'account_suspended' },
    );
    void navigate({ to: '/sign-in', search: { notice }, hash: true, replace: true }).catch(() => {
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
      if (mountedRef.current) setStatus({ code: signInFailureCode(failureCode(error)) });
    } finally {
      setPending(null);
    }
  }

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
                maxBytes={LIMITS.password.maxBytes}
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
