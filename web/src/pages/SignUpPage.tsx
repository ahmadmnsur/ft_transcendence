import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  isValidDisplayName,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
} from '@shared/limits';
import { ApiProtocolError, ApiRefusalError } from '../api/client';
import { signup } from '../api/auth';
import { SESSION_QUERY_KEY } from '../api/session';
import { Banner, Button, Card, Checkbox, PasswordField, TextField } from '../design';
import { PageTitle } from '../layout';
import { authCopy, authErrorMessage } from '../auth/messages';

const copy = authCopy.signUp;

function confirmationError(password: string, confirmation: string): string | undefined {
  if (confirmation.trim() === '') return copy.confirmPasswordEmpty;
  return confirmation.trim() === password.trim() ? undefined : copy.confirmPasswordMismatch;
}

function failureMessage(error: unknown): string {
  if (error instanceof ApiRefusalError) return authErrorMessage(error.code);
  if (error instanceof ApiProtocolError) return authErrorMessage(error.code);
  return authErrorMessage(undefined);
}

// §3.5.1: the signed-out sign-up page. Client validation uses the shared
// limits, so in normal use the submit never sends an invalid request.
export function SignUpPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [displayNameError, setDisplayNameError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | undefined>(undefined);
  const [termsError, setTermsError] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const displayNameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);
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
    const nextDisplayNameError = isValidDisplayName(displayName) ? undefined : copy.displayNameInvalid;
    const nextPasswordError = isValidPassword(password) ? undefined : copy.passwordInvalid;
    const nextConfirmPasswordError = confirmationError(password, confirmPassword);
    const nextTermsError = acceptTerms ? undefined : copy.acceptTermsInvalid;
    setEmailError(nextEmailError);
    setDisplayNameError(nextDisplayNameError);
    setPasswordError(nextPasswordError);
    setConfirmPasswordError(nextConfirmPasswordError);
    setTermsError(nextTermsError);
    setStatus(undefined);
    const firstInvalid =
      nextEmailError !== undefined
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
    if (nextTermsError !== undefined) {
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
                hint={copy.emailHint}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={emailError}
              />
              <TextField
                ref={displayNameRef}
                label={copy.displayNameLabel}
                hint={copy.displayNameHint}
                type="text"
                autoComplete="nickname"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                error={displayNameError}
              />
              <PasswordField
                ref={passwordRef}
                label={copy.passwordLabel}
                hint={copy.passwordHint}
                {...authCopy.passwordVisibility}
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (confirmPasswordError !== undefined) {
                    setConfirmPasswordError(confirmationError(event.target.value, confirmPassword));
                  }
                }}
                error={passwordError}
              />
              <PasswordField
                ref={confirmPasswordRef}
                label={copy.confirmPasswordLabel}
                {...copy.confirmPasswordVisibility}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (confirmPasswordError !== undefined) {
                    setConfirmPasswordError(confirmationError(password, event.target.value));
                  }
                }}
                error={confirmPasswordError}
              />
              <div className="min-w-0">
                <Checkbox
                  ref={termsRef}
                  label={copy.acceptTermsLabel}
                  checked={acceptTerms}
                  onChange={(event) => setAcceptTerms(event.target.checked)}
                  error={termsError}
                />
                <p className="mt-1 ps-6 text-xs text-ink-muted">
                  {copy.acceptTermsLinksPrefix}{' '}
                  <Link to="/terms" className="rounded text-link underline underline-offset-2 focus-ring">
                    {copy.termsLink}
                  </Link>{' '}
                  ·{' '}
                  <Link to="/privacy" className="rounded text-link underline underline-offset-2 focus-ring">
                    {copy.privacyLink}
                  </Link>
                </p>
              </div>
              <Button type="submit" loading={pending} className="w-full">
                {pending ? copy.submitting : copy.submit}
              </Button>
            </form>
          </Card>
          <p className="text-center text-sm text-ink-muted">
            {copy.haveAccountCta}{' '}
            <Link to="/sign-in" className="rounded text-link underline underline-offset-2 focus-ring">
              {copy.signInLink}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
