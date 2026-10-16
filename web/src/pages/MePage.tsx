import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LIMITS, isValidPassword } from '@shared/limits';
import { ApiProtocolError, ApiRefusalError } from '../api/client';
import { changePassword } from '../api/auth';
import { SESSION_QUERY_KEY, fetchSession, sessionQueryOptions } from '../api/session';
import { Banner, Button, Card, TextField } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { LearningGoalCard } from '../profile/LearningGoalCard';
import { ProfileDetailsCard } from '../profile/ProfileDetailsCard';
import { SkillsCard } from '../profile/SkillsCard';
import { profileCopy } from '../profile/messages';

// `/me` (§3.5.1, §6.2): the profile, Skills and Learning Goal cards above the
// password-change form under a clear heading. On success the Student is signed
// out everywhere, so the page clears the session query and returns to
// `/sign-in` with a notice. Any failure other than a refusal re-probes the
// session first: signed out returns with the neutral notice, still signed in
// stays on the form with the failure's sentence (§5.1).
export function MePage(): React.JSX.Element {
  const { t, format, errorText } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // The hidden username field below carries the signed-in Student's email.
  const { data: session } = useQuery(sessionQueryOptions());
  const username = session?.authenticated === true ? session.student.email : '';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentError, setCurrentError] = useState<'empty' | 'invalid' | undefined>(undefined);
  const [newError, setNewError] = useState(false);
  const [confirmError, setConfirmError] = useState(false);
  const [status, setStatus] = useState<{ code: unknown } | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const passwordInvalid = format(t.auth.password.invalid, {
    minChars: LIMITS.password.minChars,
    maxBytes: LIMITS.password.maxBytes,
  });

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
    const nextCurrentError: 'empty' | 'invalid' | undefined =
      currentPassword === '' ? 'empty' : isValidPassword(currentPassword) ? undefined : 'invalid';
    const nextNewError = !isValidPassword(newPassword);
    const nextConfirmError = nextNewError || confirmPassword.trim() !== newPassword.trim();
    setCurrentError(nextCurrentError);
    setNewError(nextNewError);
    setConfirmError(nextConfirmError);
    setStatus(undefined);
    if (nextCurrentError !== undefined) {
      currentRef.current?.focus();
      return;
    }
    if (nextNewError) {
      newRef.current?.focus();
      return;
    }
    if (nextConfirmError) {
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
        setStatus({ code: error.code });
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
      setStatus({ code: error instanceof ApiProtocolError ? error.code : undefined });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageTitle name={t.auth.passwordChange.title} />
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-semibold text-ink">{t.auth.passwordChange.heading}</h1>
        {session?.authenticated === true ? (
          <p className="mt-2 text-sm">
            <Link
              to="/students/$studentId"
              params={{ studentId: session.student.id }}
              className="rounded text-link underline underline-offset-2 focus-ring"
            >
              {profileCopy.me.publicProfileLink}
            </Link>
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-4">
          <ProfileDetailsCard />
          <SkillsCard />
          <LearningGoalCard />
        </div>
        <Card title={t.auth.passwordChange.cardTitle} subtitle={t.auth.passwordChange.cardSubtitle} className="mt-4">
          <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-4">
            {status !== undefined ? (
              <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
                <Banner tone="danger" title={errorText(status.code)} />
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
              label={t.auth.passwordChange.currentLabel}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              error={
                currentError === undefined
                  ? undefined
                  : currentError === 'empty'
                    ? t.auth.passwordChange.currentEmpty
                    : passwordInvalid
              }
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
            <Button type="submit" loading={pending} className="w-full">
              {pending ? t.auth.passwordChange.submitting : t.auth.passwordChange.submit}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
