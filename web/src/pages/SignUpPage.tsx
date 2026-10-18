import { useEffect, useRef, useState } from 'react';
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LIMITS,
  isValidDisplayName,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
} from '@shared/limits';
import { ApiProtocolError, ApiRefusalError } from '../api/client';
import { signup, signup42, signUpDraft42QueryOptions } from '../api/auth';
import { SESSION_QUERY_KEY } from '../api/session';
import { Banner, Button, Card, Checkbox, PasswordField, TextField } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';

// Which message the confirmation shows, or undefined when it matches.
function confirmationError(password: string, confirmation: string): 'empty' | 'mismatch' | undefined {
  if (confirmation.trim() === '') return 'empty';
  return confirmation.trim() === password.trim() ? undefined : 'mismatch';
}

// The code a failed sign-up carries, or undefined when the response is not
// the envelope; the text is read while rendering, so a switch re-renders it.
function failureCode(error: unknown): unknown {
  if (error instanceof ApiRefusalError) return error.code;
  if (error instanceof ApiProtocolError) return error.code;
  return undefined;
}

const signUpSearch = getRouteApi('/sign-up');

// §3.5.1: the signed-out sign-up page. Client validation uses the shared
// limits, so in normal use the submit never sends an invalid request.
// §5.6 B: reached with `from=42`, it is the 42 variant — the same form, whose
// fields start from the draft `GET /api/auth/42/draft` names, both editable,
// and whose submit goes to the 42 sign-up route; everything else, including
// the Terms checkbox validation and not storing it, is the ordinary sign-up
// it has always been.
export function SignUpPage(): React.JSX.Element {
  const { t, format, errorText } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { from } = signUpSearch.useSearch();
  const is42 = from === '42';
  // §5.6 B: the server-side state a first 42 login left for this browser;
  // the read never removes it. While it is pending the page says so instead
  // of empty fields, only a live draft pre-fills, and a failure is answered
  // by the read-dead effect below.
  const draftQuery = useQuery({ ...signUpDraft42QueryOptions(), enabled: is42 });
  const draft = draftQuery.data;
  const [typedEmail, setTypedEmail] = useState<string | null>(null);
  const [typedDisplayName, setTypedDisplayName] = useState<string | null>(null);
  // Null while not yet typed, so the draft's pre-fill shows and first
  // keystrokes hold; the ordinary form's initial value is '' as it always
  // was.
  const email = is42 ? (typedEmail ?? draft?.email ?? '') : (typedEmail ?? '');
  const displayName = is42 ? (typedDisplayName ?? draft?.login ?? '') : (typedDisplayName ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [displayNameError, setDisplayNameError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState<'empty' | 'mismatch' | undefined>(undefined);
  const [termsError, setTermsError] = useState(false);
  const [status, setStatus] = useState<{ code: unknown } | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const displayNameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const passwordInvalid = format(t.auth.password.invalid, {
    minChars: LIMITS.password.minChars,
    maxBytes: LIMITS.password.maxBytes,
  });

  // The status slot renders only while there is a message; once it renders,
  // focus moves to it, as with the field errors below.
  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  // §5.6 B: a dead draft — `oauth_failed` with no live draft, or 404
  // `not_found` while 42 is off behind a stale `from=42` link — sends the
  // browser back to sign-in, whose `?oauth=failed` failure sentence is the
  // whole form's answer. A replaced navigation: no one returns to a form
  // that cannot be sent again. Any other failure keeps the form below with
  // a retry.
  useEffect(() => {
    if (!is42) return;
    const error: unknown = draftQuery.error;
    if (error === null || error === undefined) return;
    const dead =
      failureCode(error) === 'oauth_failed' ||
      (error instanceof ApiProtocolError && error.status === 404);
    if (!dead) return;
    void navigate({ to: '/sign-in', search: { oauth: 'failed' }, replace: true }).catch(() => {
      // The URL stays as it is if the replacement fails; the sentence shows.
    });
  }, [is42, draftQuery.error, navigate]);

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const nextEmailError = !isValidEmail(email);
    const nextDisplayNameError = !isValidDisplayName(displayName);
    const nextPasswordError = !isValidPassword(password);
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
      : nextDisplayNameError
        ? displayNameRef
        : nextPasswordError
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
      // §5.6 B: the 42 variant's request is its own route; the 42 id travels
      // in the attempt the `a.` cookie names, never in this body.
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
        // §5.6 B: the submit was refused because the draft was used up or
        // expired — the 42 form is over, and sign-in's failure sentence
        // shows there. A replaced navigation, like the read-dead one above.
        void navigate({ to: '/sign-in', search: { oauth: 'failed' }, replace: true }).catch(() => {
          // The URL stays as it is if the replacement fails; the form stays.
        });
        return;
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
            {is42 && draftQuery.isPending ? (
              // §5.6 B: the draft read is still running — say so instead of
              // empty fields.
              <p className="text-sm text-ink-muted">{t.auth.signUp.loading42}</p>
            ) : is42 && draftQuery.isError ? (
              // §5.6 B: a failure the read-dead effect did not answer waits
              // for a retry here, its errorText above the button. A dead
              // draft's one frame of this branch already navigates to
              // sign-in.
              <>
                <Banner tone="danger" title={errorText(failureCode(draftQuery.error))} />
                <Button type="button" className="w-full" onClick={() => void draftQuery.refetch()}>
                  {t.auth.signUp.retry42}
                </Button>
              </>
            ) : (
              <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-4">
                {is42 && draft !== undefined ? (
                  <Banner tone="info" title={t.auth.signUp.notePrefilled} />
                ) : null}
                {status !== undefined ? (
                  <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
                    {is42 && status.code === 'email_unavailable' ? (
                      // §5.6 B: a taken email never links by email — its
                      // owner signs in with their password and connects 42
                      // there.
                      <Banner
                        tone="danger"
                        title={t.auth.signUp.emailTaken42}
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
                ) : null}
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
                    displayNameError
                      ? format(t.auth.signUp.displayNameInvalid, {
                          count: LIMITS.displayName.maxChars,
                          minChars: LIMITS.displayName.minChars,
                        })
                      : undefined
                  }
                />
                <PasswordField
                  ref={passwordRef}
                  label={t.auth.signUp.passwordLabel}
                  hint={format(t.auth.password.hint, {
                    minChars: LIMITS.password.minChars,
                    maxBytes: LIMITS.password.maxBytes,
                  })}
                  {...t.auth.passwordVisibility}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (confirmPasswordError !== undefined) {
                      setConfirmPasswordError(confirmationError(event.target.value, confirmPassword));
                    }
                  }}
                  error={passwordError ? passwordInvalid : undefined}
                />
                <PasswordField
                  ref={confirmPasswordRef}
                  label={t.auth.signUp.confirmPasswordLabel}
                  {...t.auth.signUp.confirmPasswordVisibility}
                  autoComplete="new-password"
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
