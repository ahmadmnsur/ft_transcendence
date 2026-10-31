import { useEffect, useRef, useState } from 'react';
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LIMITS, isValidPassword } from '@shared/limits';
import { ApiProtocolError, ApiRefusalError } from '../api/client';
import { changePassword } from '../api/auth';
import { configQueryOptions } from '../api/config';
import { SESSION_QUERY_KEY, fetchSession, sessionQueryOptions } from '../api/session';
import { Banner, Button, Card, TextField } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { AvatarCard } from '../profile/AvatarCard';
import { FortyTwoCard } from '../profile/FortyTwoCard';
import { LearningGoalCard } from '../profile/LearningGoalCard';
import { ProfileDetailsCard } from '../profile/ProfileDetailsCard';
import { SkillsCard } from '../profile/SkillsCard';
import { ME_QUERY_KEY, meQueryOptions } from '../api/profile';
import { ConfirmWith42Card } from '../profile/ConfirmWith42Card';
import { useOwnProfileTarget } from '../profile/target';
import { OwnProgressCard } from '../progress/ProgressCard';

const meSearch = getRouteApi('/me');

export function MePage(): React.JSX.Element {
  const { t, format, errorText } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: session } = useQuery(sessionQueryOptions());
  const { data: me, isError: meError, refetch: refetchMe } = useQuery(meQueryOptions());
  const profile = useOwnProfileTarget();
  const { data: config } = useQuery(configQueryOptions());
  const { oauth } = meSearch.useSearch();
  const [oauthNotice, setOauthNotice] = useState<'connected' | 'in_use' | 'failed' | undefined>(
    undefined,
  );
  const [confirmed42, setConfirmed42] = useState(false);
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

  const passwordInvalid = format(t.auth.password.invalid, { count: LIMITS.password.minChars });

  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (oauth === undefined) return;
    if (oauth === 'connected') void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    if (oauth === 'confirmed') setConfirmed42(true);
    else setOauthNotice(oauth);
    void navigate({ to: '/me', search: {}, replace: true }).catch(() => {
    });
  }, [oauth, navigate, queryClient]);

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
        setStatus({ code: error.code });
        return;
      }
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
              {t.profile.me.publicProfileLink}
            </Link>
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-4">
          {oauthNotice !== undefined ? (
            <Banner
              tone={oauthNotice === 'connected' ? 'success' : 'danger'}
              title={
                oauthNotice === 'connected'
                  ? t.profile.fortyTwo.noticeConnected
                  : oauthNotice === 'in_use'
                    ? t.profile.fortyTwo.noticeInUse
                    : t.errors.codes.oauth_failed
              }
            />
          ) : null}
          {me === undefined && meError ? (
            <div className="flex min-w-0 flex-col gap-2">
              <Banner tone="danger" title={t.errors.unknown} />
              <Button variant="secondary" className="self-start" onClick={() => void refetchMe()}>
                {t.profile.me.retry}
              </Button>
            </div>
          ) : null}
          <AvatarCard target={profile} />
          <ProfileDetailsCard target={profile} />
          <OwnProgressCard />
          <SkillsCard target={profile} />
          <LearningGoalCard target={profile} />
          {config?.oauth42Enabled === true ? (
            <FortyTwoCard onAction={() => setOauthNotice(undefined)} />
          ) : null}
        </div>
        <Card title={t.auth.passwordChange.cardTitle} subtitle={t.auth.passwordChange.cardSubtitle} headingLevel={2} className="mt-4">
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
              maxBytes={LIMITS.password.maxBytes}
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
              hint={format(t.auth.password.hint, { count: LIMITS.password.minChars })}
              type="password"
              autoComplete="new-password"
              maxBytes={LIMITS.password.maxBytes}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              error={newError ? passwordInvalid : undefined}
            />
            <TextField
              ref={confirmRef}
              label={t.auth.passwordChange.confirmLabel}
              type="password"
              autoComplete="new-password"
              maxBytes={LIMITS.password.maxBytes}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={confirmError ? t.auth.passwordChange.confirmInvalid : undefined}
            />
            <Button type="submit" loading={pending} className="w-full">
              {pending ? t.auth.passwordChange.submitting : t.auth.passwordChange.submit}
            </Button>
          </form>
        </Card>
        {config?.oauth42Enabled === true ? (
          <ConfirmWith42Card
            confirmed={confirmed42}
            onAction={() => setOauthNotice(undefined)}
            onConfirmedEnd={() => setConfirmed42(false)}
            onSignedOut={signOutAndGo}
            className="mt-4"
          />
        ) : null}
      </div>
    </>
  );
}
