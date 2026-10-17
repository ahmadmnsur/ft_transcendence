import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  LIMITS,
  isValidDisplayName,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
} from '@shared/limits';
import { ApiProtocolError, ApiRefusalError } from '../api/client';
import { signup } from '../api/auth';
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

// §3.5.1: the signed-out sign-up page. Client validation uses the shared
// limits, so in normal use the submit never sends an invalid request.
export function SignUpPage(): React.JSX.Element {
  const { t, format, errorText } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
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
      const student = await signup({
        email: normalizeEmail(email),
        password: password.trim(),
        displayName: displayName.trim(),
        acceptTerms: true,
      });
      queryClient.setQueryData(SESSION_QUERY_KEY, { authenticated: true, student });
      await navigate({ to: '/' });
    } catch (error) {
      setStatus({ code: failureCode(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageTitle name={t.auth.signUp.title} />
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-semibold text-ink">{t.auth.signUp.heading}</h1>
        <div className="mt-4 flex min-w-0 flex-col gap-4">
          <Card>
            <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-4">
              {status !== undefined ? (
                <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
                  <Banner tone="danger" title={errorText(status.code)} />
                </div>
              ) : null}
              <TextField
                ref={emailRef}
                label={t.auth.signUp.emailLabel}
                hint={t.auth.signUp.emailHint}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                onChange={(event) => setDisplayName(event.target.value)}
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
          </Card>
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
