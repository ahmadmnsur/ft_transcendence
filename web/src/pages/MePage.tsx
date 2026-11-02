import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { configQueryOptions } from '../api/config';
import { SESSION_QUERY_KEY, sessionQueryOptions } from '../api/session';
import { Banner, Button, buttonClasses } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { AvatarCard } from '../profile/AvatarCard';
import { LearningGoalCard } from '../profile/LearningGoalCard';
import { ProfileDetailsCard } from '../profile/ProfileDetailsCard';
import { ProfileNav } from '../profile/ProfileNav';
import { SecurityCard } from '../profile/SecurityCard';
import { SkillsCard } from '../profile/SkillsCard';
import { ME_QUERY_KEY, meQueryOptions } from '../api/profile';
import { useOwnProfileTarget } from '../profile/target';
import { UnsavedChangesGuard } from '../profile/unsaved';
import { OwnProgressCard } from '../progress/ProgressCard';

const meSearch = getRouteApi('/me');

const LEARN_PICKER_ID = 'me-learn-skill';

type OAuthNotice = 'connected' | 'in_use' | 'failed';

function Section({ id, children }: { id: string; children: ReactNode }): React.JSX.Element {
  return (
    <div id={id} className="min-w-0 scroll-mt-6 [&_h2]:rounded-sm [&_h2]:focus-ring">
      {children}
    </div>
  );
}

export function MePage(): React.JSX.Element {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: session } = useQuery(sessionQueryOptions());
  const { data: me, isError: meError, refetch: refetchMe } = useQuery(meQueryOptions());
  const profile = useOwnProfileTarget();
  const { data: config } = useQuery(configQueryOptions());
  const { oauth } = meSearch.useSearch();
  const [oauthNotice, setOauthNotice] = useState<OAuthNotice | undefined>(undefined);
  const [confirmed42At, setConfirmed42At] = useState<number | null>(null);
  const username = session?.authenticated === true ? session.student.email : '';
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (oauthNotice !== undefined) noticeRef.current?.focus();
  }, [oauthNotice]);

  useEffect(() => {
    if (oauth === undefined) return;
    if (oauth === 'connected') void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    if (oauth === 'confirmed') setConfirmed42At(Date.now());
    else setOauthNotice(oauth);
    const replaceTimer = window.setTimeout(() => {
      void navigate({ to: '/me', search: {}, replace: true, resetScroll: false }).catch(() => {
      });
    }, 0);
    return () => window.clearTimeout(replaceTimer);
  }, [oauth, navigate, queryClient]);

  function signOutAndGo(notice: 'password-changed' | 'password-change-unknown'): Promise<void> {
    queryClient.clear();
    queryClient.setQueryData(SESSION_QUERY_KEY, { authenticated: false });
    return navigate({ to: '/sign-in', search: { notice }, replace: true, ignoreBlocker: true });
  }

  const sections = [
    { id: 'me-skills', label: t.profile.skills.title },
    { id: 'me-goal', label: t.profile.goal.title },
    { id: 'me-avatar', label: t.profile.avatar.title },
    { id: 'me-details', label: t.profile.details.title },
    { id: 'me-progress', label: t.progress.title },
    { id: 'me-security', label: t.profile.security.title },
  ];

  return (
    <UnsavedChangesGuard>
      <PageTitle name={t.auth.passwordChange.title} />
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0 flex-1 basis-80">
            <h1 className="text-2xl font-semibold text-ink">{t.auth.passwordChange.heading}</h1>
            <p className="mt-1 max-w-prose text-sm text-ink-muted text-pretty">{t.profile.me.intro}</p>
          </div>
          {session?.authenticated === true ? (
            <Link
              to="/students/$studentId"
              params={{ studentId: session.student.id }}
              className={buttonClasses({ variant: 'secondary', size: 'sm' })}
            >
              {t.profile.me.publicProfileLink}
            </Link>
          ) : null}
        </header>
        {oauthNotice !== undefined ? (
          <div ref={noticeRef} tabIndex={-1} className="mt-6 rounded-lg focus-ring">
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
          </div>
        ) : null}
        {me === undefined && meError ? (
          <div className="mt-6 flex min-w-0 flex-col gap-2">
            <Banner tone="danger" title={t.profile.me.loadFailed} />
            <Button variant="secondary" className="self-start" onClick={() => void refetchMe()}>
              {t.profile.me.retry}
            </Button>
          </div>
        ) : null}
        <div className="mt-4 lg:hidden">
          <ProfileNav label={t.profile.me.navLabel} items={sections} layout="grid" />
        </div>
        <div className="mt-6 grid min-w-0 gap-8 lg:mt-8 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
          <div className="hidden lg:block">
            <ProfileNav label={t.profile.me.navLabel} items={sections} layout="list" />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <Section id="me-skills">
              <SkillsCard target={profile} learnPickerId={LEARN_PICKER_ID} />
            </Section>
            <Section id="me-goal">
              <LearningGoalCard target={profile} learnPickerId={LEARN_PICKER_ID} />
            </Section>
            <Section id="me-avatar">
              <AvatarCard target={profile} />
            </Section>
            <Section id="me-details">
              <ProfileDetailsCard target={profile} />
            </Section>
            <Section id="me-progress">
              <OwnProgressCard />
            </Section>
            <Section id="me-security">
              <SecurityCard
                username={username}
                fortyTwoEnabled={config?.oauth42Enabled === true}
                onNoticeRetire={() => setOauthNotice(undefined)}
                confirmed42At={confirmed42At}
                onConfirmedEnd={() => setConfirmed42At(null)}
                onSignedOut={signOutAndGo}
              />
            </Section>
          </div>
        </div>
      </div>
    </UnsavedChangesGuard>
  );
}
