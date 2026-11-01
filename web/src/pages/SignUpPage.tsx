import { useEffect, useRef, useState } from 'react';
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LIMITS,
  hasEmoji,
  isValidDisplayName,
  isValidEmail,
  isValidNewPassword,
  normalizeEmail,
} from '@shared/limits';
import { ApiProtocolError, ApiRefusalError } from '../api/client';
import { signup, signup42, fetchSignUpDraft42, signUpDraft42QueryOptions, SIGN_UP_DRAFT_42_QUERY_KEY } from '../api/auth';
import { SESSION_QUERY_KEY } from '../api/session';
import { Banner, Button, Card, Checkbox, PasswordField, TextField, buttonClasses } from '../design';
import { useI18n } from '../i18n/context';
import { BRAND, PageTitle } from '../layout';

function confirmationError(password: string, confirmation: string): 'empty' | 'mismatch' | undefined {
  if (confirmation.trim() === '') return 'empty';
  return confirmation.trim() === password.trim() ? undefined : 'mismatch';
}

function failureCode(error: unknown): unknown {
  if (error instanceof ApiRefusalError) return error.code;
  if (error instanceof ApiProtocolError) return error.code;
  return undefined;
}

function draftDead(error: unknown): boolean {
  return failureCode(error) === 'oauth_failed' || (error instanceof ApiProtocolError && error.status === 404);
}

const signUpSearch = getRouteApi('/sign-up');

export function SignUpPage(): React.JSX.Element {
  const { t, format, formatText, errorText } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { from } = signUpSearch.useSearch();
  const is42 = from === '42';
  const draftQuery = useQuery({ ...signUpDraft42QueryOptions(), enabled: is42 });
  const draft = draftQuery.data;
  const [typedEmail, setTypedEmail] = useState<string | null>(null);
  const [typedDisplayName, setTypedDisplayName] = useState<string | null>(null);
  const email = is42 ? (typedEmail ?? draft?.email ?? '') : (typedEmail ?? '');
  const displayName = is42 ? (typedDisplayName ?? draft?.login ?? '') : (typedDisplayName ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<'emoji' | 'invalid' | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<'emoji' | 'invalid' | undefined>(undefined);
  const [confirmPasswordError, setConfirmPasswordError] = useState<'empty' | 'mismatch' | undefined>(undefined);
  const [termsError, setTermsError] = useState(false);
  const [status, setStatus] = useState<{ code: unknown } | undefined>(undefined);
  const [closed42, setClosed42] = useState(false);
  const [pending, setPending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const displayNameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const passwordInvalid = format(t.auth.password.invalid, { count: LIMITS.password.minChars });

  const statusBlock =
    status !== undefined ? (
      <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
        {is42 && status.code === 'email_unavailable' ? (
          <Banner
            tone="danger"
            title={formatText(t.auth.signUp.emailTaken42, { brand: BRAND })}
            body={format(t.auth.signUp.emailTaken42Action, {
              link: (
                <Link
                  to="/sign-in"
                  className="rounded text-link underline underline-offset-2 focus-ring"
                >
                  {t.auth.signUp.signInLink}
                </Link>
              ),
            })}
          />
        ) : (
          <Banner tone="danger" title={errorText(status.code)} />
        )}
      </div>
    ) : null;

  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  useEffect(() => {
    setStatus(undefined);
  }, [is42]);

  useEffect(() => {
    if (!is42 || closed42) return;
    const error: unknown = draftQuery.error;
    if (error === null || error === undefined) return;
    if (!draftDead(error)) return;
    void navigate({ to: '/sign-in', search: { oauth: 'failed' }, replace: true }).catch(() => {
    });
  }, [is42, closed42, draftQuery.error, navigate]);

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const nextEmailError = !isValidEmail(email);
    const nextDisplayNameError = isValidDisplayName(displayName) ? undefined : hasEmoji(displayName) ? 'emoji' : 'invalid';
    const nextPasswordError = isValidNewPassword(password) ? undefined : hasEmoji(password) ? 'emoji' : 'invalid';
    const nextConfirmPasswordError = confirmationError(password, confirmPassword);
    const nextTermsError = !acceptTerms;
    setEmailError(nextEmailError);
    setDisplayNameError(nextDisplayNameError);
    setPasswordError(nextPasswordError);
    setConfirmPasswordError(nextConfirmPasswordError);
    setTermsError(nextTermsError);
    setStatus(undefined);
    const firstInvalid = nextEmailError
      ? emailRef
      : nextDisplayNameError !== undefined
        ? displayNameRef
        : nextPasswordError !== undefined
          ? passwordRef
          : nextConfirmPasswordError !== undefined
            ? confirmPasswordRef
            : null;
    if (firstInvalid !== null) {
      firstInvalid.current?.focus();
      return;
    }
    if (nextTermsError) {
      termsRef.current?.focus();
      return;
    }
    setPending(true);
    try {
      const student = is42
        ? await signup42({
            email: normalizeEmail(email),
            password: password.trim(),
            displayName: displayName.trim(),
            acceptTerms: true,
          })
        : await signup({
            email: normalizeEmail(email),
            password: password.trim(),
            displayName: displayName.trim(),
            acceptTerms: true,
          });
      queryClient.setQueryData(SESSION_QUERY_KEY, { authenticated: true, student });
      await navigate({ to: '/' });
    } catch (error) {
      const code = failureCode(error);
      if (is42 && code === 'oauth_failed') {
        void navigate({ to: '/sign-in', search: { oauth: 'failed' }, replace: true }).catch(() => {
        });
        return;
      }
      if (is42) {
        try {
          await fetchSignUpDraft42();
        } catch (readError) {
          if (draftDead(readError)) {
            queryClient.removeQueries({ queryKey: SIGN_UP_DRAFT_42_QUERY_KEY });
            setClosed42(true);
          }
        }
      }
      setStatus({ code });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageTitle name={is42 ? t.auth.signUp.title42 : t.auth.signUp.title} />
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-semibold text-ink">
          {is42 ? t.auth.signUp.heading42 : t.auth.signUp.heading}
        </h1>
        <div className="mt-4 flex min-w-0 flex-col gap-4">
          <Card>
            {is42 && closed42 ? (
              <div className="flex min-w-0 flex-col gap-4">
                {statusBlock}
                <p className="text-sm text-ink-muted">{t.auth.signUp.closed42}</p>
                <Link to="/sign-in" className={`${buttonClasses()} w-full`}>
                  {t.auth.signUp.startOver42}
                </Link>
              </div>
            ) : is42 && draftQuery.isPending ? (
              <p className="text-sm text-ink-muted">{t.auth.signUp.loading42}</p>
            ) : is42 && draftQuery.isError ? (
              <div className="flex min-w-0 flex-col gap-4">
                <Banner tone="danger" title={errorText(failureCode(draftQuery.error))} />
                <Button type="button" className="w-full" onClick={() => void draftQuery.refetch()}>
                  {t.auth.signUp.retry42}
                </Button>
              </div>
            ) : (
              <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-4">
                {is42 && draft !== undefined ? (
                  <Banner tone="info" title={t.auth.signUp.notePrefilled} />
                ) : null}
                {statusBlock}
                <TextField
                  ref={emailRef}
                  label={t.auth.signUp.emailLabel}
                  hint={t.auth.signUp.emailHint}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setTypedEmail(event.target.value)}
                  error={emailError ? t.auth.signUp.emailInvalid : undefined}
                />
                <TextField
                  ref={displayNameRef}
                  label={t.auth.signUp.displayNameLabel}
                  hint={format(t.auth.signUp.displayNameHint, {
                    count: LIMITS.displayName.maxChars,
                    minChars: LIMITS.displayName.minChars,
                  })}
                  type="text"
                  autoComplete="nickname"
                  value={displayName}
                  onChange={(event) => setTypedDisplayName(event.target.value)}
                  error={
                    displayNameError === undefined
                      ? undefined
                      : displayNameError === 'emoji'
                        ? t.auth.signUp.displayNameEmoji
                        : format(t.auth.signUp.displayNameInvalid, {
                            count: LIMITS.displayName.maxChars,
                            minChars: LIMITS.displayName.minChars,
                          })
                  }
                />
                <PasswordField
                  ref={passwordRef}
                  label={t.auth.signUp.passwordLabel}
                  hint={format(t.auth.password.hint, { count: LIMITS.password.minChars })}
                  {...t.auth.passwordVisibility}
                  autoComplete="new-password"
                  maxBytes={LIMITS.password.maxBytes}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (confirmPasswordError !== undefined) {
                      setConfirmPasswordError(confirmationError(event.target.value, confirmPassword));
                    }
                  }}
                  error={
                    passwordError === undefined
                      ? undefined
                      : passwordError === 'emoji'
                        ? t.auth.password.emoji
                        : passwordInvalid
                  }
                />
                <PasswordField
                  ref={confirmPasswordRef}
                  label={t.auth.signUp.confirmPasswordLabel}
                  {...t.auth.signUp.confirmPasswordVisibility}
                  autoComplete="new-password"
                  maxBytes={LIMITS.password.maxBytes}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    if (confirmPasswordError !== undefined) {
                      setConfirmPasswordError(confirmationError(password, event.target.value));
                    }
                  }}
                  error={
                    confirmPasswordError === undefined
                      ? undefined
                      : confirmPasswordError === 'empty'
                        ? t.auth.signUp.confirmPasswordEmpty
                        : t.auth.signUp.confirmPasswordMismatch
                  }
                />
                <div className="min-w-0">
                  <Checkbox
                    ref={termsRef}
                    label={t.auth.signUp.acceptTermsLabel}
                    checked={acceptTerms}
                    onChange={(event) => setAcceptTerms(event.target.checked)}
                    error={termsError ? t.auth.signUp.acceptTermsInvalid : undefined}
                  />
                  <p className="mt-1 ps-6 text-xs text-ink-muted">
                    {format(t.auth.signUp.readFullText, {
                      termsLink: (
                        <Link to="/terms" className="rounded text-link underline underline-offset-2 focus-ring">
                          {t.auth.signUp.termsLink}
                        </Link>
                      ),
                      privacyLink: (
                        <Link to="/privacy" className="rounded text-link underline underline-offset-2 focus-ring">
                          {t.auth.signUp.privacyLink}
                        </Link>
                      ),
                    })}
                  </p>
                </div>
                <Button type="submit" loading={pending} className="w-full">
                  {pending ? t.auth.signUp.submitting : t.auth.signUp.submit}
                </Button>
              </form>
            )}
          </Card>
          {is42 ? (
            <p className="text-center text-sm text-ink-muted">
              {format(t.auth.signUp.no42Question, {
                link: (
                  <Link
                    to="/sign-up"
                    search={{}}
                    className="rounded text-link underline underline-offset-2 focus-ring"
                  >
                    {t.auth.signUp.no42Link}
                  </Link>
                ),
              })}
            </p>
          ) : null}
          <p className="text-center text-sm text-ink-muted">
            {format(t.auth.signUp.haveAccount, {
              link: (
                <Link to="/sign-in" className="rounded text-link underline underline-offset-2 focus-ring">
                  {t.auth.signUp.signInLink}
                </Link>
              ),
            })}
          </p>
        </div>
      </div>
    </>
  );
}
