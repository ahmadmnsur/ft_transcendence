import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiProtocolError } from './api/client';
import { logout } from './api/auth';
import { SESSION_QUERY_KEY, fetchSession, sessionQueryOptions } from './api/session';
import { useI18n } from './i18n/context';
import { languageNames, languages } from './i18n/language';
import { AlertIcon, Button, ChevronDownIcon, EmptyState, IconButton, MenuIcon, MoonIcon, PersonName, SearchIcon, Select, SunIcon, buttonClasses, useTheme } from './design';
import { RealtimeConnection } from './realtime/connection';
import { MessageUpdates } from './messages/MessageUpdates';
import { RoundUpdates } from './matching/RoundUpdates';
import { FeedUpdates } from './feed/FeedUpdates';
import { PresenceUpdates } from './social/PresenceUpdates';
import { useDisclosure } from './shell/useDisclosure';

export const BRAND = '21 Beirut';

export function PageTitle({ name }: { name?: string }): React.JSX.Element {
  const { t, formatText } = useI18n();
  return <title>{name === undefined ? BRAND : formatText(t.shell.pageTitle, { page: name, brand: BRAND })}</title>;
}

type BarPath = '/' | '/match' | '/prompts' | '/messages' | '/students' | '/friends' | '/moderation' | '/admin';
type AccountPath = '/me' | '/feedback' | '/leaderboard' | '/rules';
type GuestPath = '/sign-in' | '/sign-up';

function activeOptions(to: string): { exact: boolean; includeSearch: false } {
  return { exact: to === '/', includeSearch: false };
}

const barLinkClass =
  'inline-flex items-center whitespace-nowrap rounded-t-lg border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors duration-150 hover:text-ink focus-ring aria-[current=page]:border-line-accent aria-[current=page]:text-ink-accent';
const panelItemClass =
  'block w-full rounded-lg px-3 py-2 text-start text-sm text-ink transition-colors duration-150 hover:bg-surface-muted focus-ring pointer-coarse:py-3 aria-[current=page]:bg-primary-50 aria-[current=page]:font-medium aria-[current=page]:text-ink-accent';
const MD_QUERY = '(width >= 48rem)';
const headerClass = 'sticky top-0 z-40 border-b border-line bg-surface';

const panelFitClass = 'max-h-[calc(100dvh-var(--header-height))] overflow-y-auto overscroll-contain';

function followHeaderHeight(header: HTMLElement | null): (() => void) | undefined {
  if (header === null) return undefined;
  const root = document.documentElement;
  const measure = (): void => {
    root.style.setProperty('--header-height', `${header.offsetHeight}px`);
  };
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(header, { box: 'border-box' });
  return () => {
    observer.disconnect();
    root.style.removeProperty('--header-height');
  };
}

function SiteHeader(): React.JSX.Element {
  const { t, language, setLanguage } = useI18n();
  const copy = t.shell.header;
  const { theme, setTheme } = useTheme();
  const { data: session } = useQuery(sessionQueryOptions());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const phoneMenu = useDisclosure<HTMLElement>();
  const accountMenu = useDisclosure<HTMLDivElement>();
  const closePhoneMenu = phoneMenu.close;
  const closeAccountMenu = accountMenu.close;

  useEffect(() => {
    const md = window.matchMedia(MD_QUERY);
    function onChange(): void {
      closePhoneMenu();
      closeAccountMenu();
    }
    md.addEventListener('change', onChange);
    return () => md.removeEventListener('change', onChange);
  }, [closePhoneMenu, closeAccountMenu]);

  function signOutLocally(): void {
    queryClient.clear();
    queryClient.setQueryData(SESSION_QUERY_KEY, { authenticated: false });
  }

  async function goToSignIn(): Promise<void> {
    await navigate({ to: '/sign-in', replace: true });
    setSigningOut(false);
  }

  async function onSignOut(): Promise<void> {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutFailed(false);
    try {
      await logout();
    } catch (error) {
      const gone = error instanceof ApiProtocolError && error.code === 'unauthenticated';
      if (!gone) {
        let signedOut = true;
        try {
          signedOut = !(await fetchSession()).authenticated;
        } catch {
          signedOut = false;
        }
        if (!signedOut) {
          setSignOutFailed(true);
          setSigningOut(false);
          if (window.matchMedia(MD_QUERY).matches) accountMenu.show();
          else phoneMenu.show();
          return;
        }
      }
    }
    signOutLocally();
    await goToSignIn();
  }

  const dark = theme === 'dark';
  const themeLabel = dark ? t.shell.theme.toLight : t.shell.theme.toDark;
  function onThemeToggle(): void {
    setTheme(dark ? 'light' : 'dark');
  }

  function onLanguageChange(value: string): void {
    const next = languages.find((l) => l === value);
    if (next !== undefined) setLanguage(next);
  }

  const student = session?.authenticated === true ? session.student : null;
  const barLinks: Array<{ to: BarPath; label: string }> = [
    { to: '/', label: t.feed.title },
    { to: '/match', label: copy.matchLink },
    { to: '/prompts', label: t.prompts.title },
    { to: '/messages', label: copy.messagesLink },
    { to: '/students', label: copy.studentsLink },
    { to: '/friends', label: copy.friendsLink },
  ];
  if (student?.role === 'PEER_MODERATOR') barLinks.push({ to: '/moderation', label: copy.moderationLink });
  if (student?.role === 'ADMIN') barLinks.push({ to: '/admin', label: copy.adminLink });
  const accountLinks: Array<{ to: AccountPath; label: string }> = [
    { to: '/me', label: copy.profileLink },
    { to: '/feedback', label: t.reviews.feedback },
    { to: '/leaderboard', label: t.leaderboard.title },
    { to: '/rules', label: t.progress.rules.nav },
  ];

  const brandLink = (
    <Link to="/" className="inline-flex h-9 min-w-0 items-center rounded-lg focus-ring">
      <svg role="img" aria-label={BRAND} viewBox="0.8 10 274 72.3" fill="currentColor" className="h-9 w-auto max-w-full">
        <g className="text-ink-accent forced-colors:text-[LinkText]">
          <path d="M29.2 43.1 49 26H86V30.4L0.9 81H96V65H59.1L102 39.6V10H43L18.8 30.9Z" />
          <path d="M122 35 143 14H156V82H137V38L122 52Z" />
        </g>
        <g className="text-primary-900 forced-colors:text-[LinkText]">
          <path d="M193.9 77.1Q193.9 79.4 192.2 80.7Q190.4 82 187.3 82H178.7V64.8H186.5Q189.7 64.8 191.3 65.9Q192.9 67 192.9 69.1Q192.9 70.6 192.1 71.6Q191.3 72.6 189.6 73Q191.7 73.2 192.8 74.3Q193.9 75.3 193.9 77.1ZM189.3 69.6Q189.3 68.5 188.6 68Q187.8 67.5 186.4 67.5H182.3V71.7H186.4Q187.9 71.7 188.6 71.2Q189.3 70.7 189.3 69.6ZM190.3 76.8Q190.3 74.4 186.8 74.4H182.3V79.3H187Q188.7 79.3 189.5 78.7Q190.3 78.1 190.3 76.8Z" />
          <path d="M197.7 82V64.8H211.3V67.6H201.3V71.9H210.5V74.7H201.3V79.2H211.8V82Z" />
          <path d="M215.4 82V64.8H219V82Z" />
          <path d="M235.2 82 231.2 75.5H226.9V82H223.3V64.8H231.9Q235 64.8 236.7 66.1Q238.4 67.4 238.4 69.9Q238.4 71.7 237.3 73Q236.3 74.4 234.6 74.8L239.2 82ZM234.7 70.1Q234.7 67.6 231.6 67.6H226.9V72.7H231.7Q233.2 72.7 234 72Q234.7 71.3 234.7 70.1Z" />
          <path d="M249.6 82.2Q246 82.2 244.1 80.5Q242.2 78.8 242.2 75.6V64.8H245.8V75.3Q245.8 77.3 246.8 78.4Q247.8 79.4 249.7 79.4Q251.6 79.4 252.6 78.3Q253.7 77.2 253.7 75.2V64.8H257.3V75.4Q257.3 78.6 255.2 80.4Q253.2 82.2 249.6 82.2Z" />
          <path d="M269.2 67.6V82H265.6V67.6H260.1V64.8H274.8V67.6Z" />
        </g>
      </svg>
    </Link>
  );

  const languageSwitcher = (
    <Select
      hideLabel
      size="sm"
      label={t.shell.language.label}
      options={languages.map((l) => ({ value: l, label: languageNames[l], lang: l }))}
      value={language}
      onValueChange={onLanguageChange}
      className="w-32 shrink-0"
    />
  );

  const phoneMenuButton = (
    <IconButton {...phoneMenu.buttonProps} label={copy.menu} className="ms-auto md:hidden">
      <MenuIcon size={20} />
    </IconButton>
  );

  const phoneMenuPanelClass = `absolute inset-x-0 top-full z-30 ${panelFitClass} border-y border-line bg-surface shadow-lg md:hidden`;

  const themeButton = (
    <IconButton label={themeLabel} size="sm" onClick={onThemeToggle} className="max-md:hidden">
      {dark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </IconButton>
  );

  const themePanelItem = (
    <button type="button" onClick={onThemeToggle} className={panelItemClass}>
      {themeLabel}
    </button>
  );

  if (student === null) {
    const guestLinks: Array<{ to: GuestPath; label: string }> = [
      { to: '/sign-in', label: copy.signInLink },
      { to: '/sign-up', label: copy.signUpLink },
    ];
    return (
      <header ref={followHeaderHeight} className={headerClass}>
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3">
          {brandLink}
          <nav aria-label={copy.navLabel} className="ms-auto hidden items-center gap-2 md:flex">
            <Link to="/sign-in" className={`shrink-0 ${buttonClasses({ variant: 'secondary', size: 'sm' })}`}>
              {copy.signInLink}
            </Link>
            <Link to="/sign-up" className={`shrink-0 ${buttonClasses({ variant: 'primary', size: 'sm' })}`}>
              {copy.signUpLink}
            </Link>
          </nav>
          {phoneMenuButton}
          <nav aria-label={copy.navLabel} {...phoneMenu.panelProps} className={phoneMenuPanelClass}>
            <div className="mx-auto w-full max-w-6xl px-4 py-2">
              <ul>
                {guestLinks.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} activeOptions={activeOptions(link.to)} className={panelItemClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-2 border-t border-line pt-2">{themePanelItem}</div>
            </div>
          </nav>
          {themeButton}
          {languageSwitcher}
        </div>
      </header>
    );
  }

  const signOut = (
    <>
      <button
        type="button"
        aria-disabled={signingOut || undefined}
        aria-busy={signingOut || undefined}
        onClick={() => void onSignOut()}
        className={`${panelItemClass} aria-disabled:cursor-wait aria-disabled:opacity-60`}
      >
        {signingOut ? copy.signingOut : copy.signOut}
      </button>
      {signOutFailed ? (
        <p role="alert" className="px-3 py-1 text-xs text-ink-danger">
          {copy.signOutFailed}
        </p>
      ) : null}
    </>
  );

  return (
    <header ref={followHeaderHeight} className={headerClass}>
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 pt-3 max-md:pb-3 sm:gap-3">
        {brandLink}
        <div className="relative ms-auto hidden md:block">
          <button type="button" {...accountMenu.buttonProps} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            <span className="sr-only">{copy.accountMenu}</span>
            <span className="max-w-40 truncate">
              <PersonName name={student.displayName} removed={false} />
            </span>
            <ChevronDownIcon size={16} className="shrink-0" />
          </button>
          <div
            {...accountMenu.panelProps}
            className={`absolute end-0 top-full z-30 mt-2 w-60 ${panelFitClass} rounded-xl border border-line bg-surface p-1 shadow-lg`}
          >
            <ul>
              {accountLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} activeOptions={activeOptions(link.to)} className={panelItemClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="my-1 border-t border-line" />
            {signOut}
          </div>
        </div>
        {phoneMenuButton}
        <nav aria-label={copy.navLabel} {...phoneMenu.panelProps} className={phoneMenuPanelClass}>
          <div className="mx-auto w-full max-w-6xl px-4 py-2">
            <ul>
              {barLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} activeOptions={activeOptions(link.to)} className={panelItemClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-2 border-t border-line pt-2">
              <p className="truncate px-3 py-1 text-xs font-medium text-ink-muted">
                <PersonName name={student.displayName} removed={false} />
              </p>
              <ul>
                {accountLinks.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} activeOptions={activeOptions(link.to)} className={panelItemClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {themePanelItem}
              {signOut}
            </div>
          </div>
        </nav>
        {themeButton}
        {languageSwitcher}
      </div>
      <nav aria-label={copy.navLabel} className="mx-auto hidden w-full max-w-6xl px-4 pt-1 md:block">
        <ul className="-mx-3 flex flex-wrap">
          {barLinks.map((link) => (
            <li key={link.to}>
              <Link to={link.to} activeOptions={activeOptions(link.to)} className={barLinkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

function SiteFooter(): React.JSX.Element {
  const { t } = useI18n();
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 text-sm">
        <Link to="/privacy" className="rounded text-link underline underline-offset-2 focus-ring">
          {t.shell.footer.privacy}
        </Link>
        <Link to="/terms" className="rounded text-link underline underline-offset-2 focus-ring">
          {t.shell.footer.terms}
        </Link>
      </div>
    </footer>
  );
}

function SkipLink(): React.JSX.Element {
  const { t } = useI18n();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:inset-s-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-link focus-ring"
    >
      {t.shell.skipLink}
    </a>
  );
}

function ShellFrame({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col bg-canvas text-ink">
      <SkipLink />
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}

export function RootLayout(): React.JSX.Element {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);
  const queryClient = useQueryClient();
  const { data: session } = useQuery(sessionQueryOptions());
  const studentId = session?.authenticated === true ? session.student.id : null;
  const previousStudentId = useRef(studentId);
  const pageId = useRouterState({ select: (state) => state.matches.at(-1)?.id });
  const [pageKey, setPageKey] = useState(0);
  const [pageOwner, setPageOwner] = useState({ pageId, studentId });
  if (pageId !== pageOwner.pageId || (studentId !== null && studentId !== pageOwner.studentId)) {
    if (pageOwner.studentId !== null && studentId !== null && studentId !== pageOwner.studentId) {
      setPageKey((key) => key + 1);
    }
    setPageOwner({ pageId, studentId });
  }

  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [pathname]);

  useLayoutEffect(() => {
    const previous = previousStudentId.current;
    previousStudentId.current = studentId;
    if (previous === null || previous === studentId) return;
    void queryClient.resetQueries({
      predicate: (query) => query.queryKey[0] !== SESSION_QUERY_KEY[0],
    });
  }, [queryClient, studentId]);

  return (
    <ShellFrame>
      <main id="main-content" ref={mainRef} tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
        <div className="mx-auto w-full max-w-6xl px-4 py-8">
          <RealtimeConnection brand={BRAND} />
          <PresenceUpdates />
          <MessageUpdates />
          <RoundUpdates />
          <FeedUpdates />
          <Fragment key={pageKey}>
            <Outlet />
          </Fragment>
        </div>
      </main>
    </ShellFrame>
  );
}

export function NotFoundPage(): React.JSX.Element {
  const { t } = useI18n();
  return (
    <>
      <PageTitle name={t.shell.notFound.name} />
      <h1 className="sr-only">{t.shell.notFound.name}</h1>
      <EmptyState
        icon={<SearchIcon size={24} />}
        title={t.shell.notFound.title}
        description={t.shell.notFound.description}
        action={
          <Link to="/" className={buttonClasses({ variant: 'secondary' })}>
            {t.shell.notFound.homeLink}
          </Link>
        }
      />
    </>
  );
}

export function ErrorContent({ reset }: ErrorComponentProps): React.JSX.Element {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <>
      <PageTitle name={t.shell.error.name} />
      <h1 className="sr-only">{t.shell.error.name}</h1>
      <EmptyState
        icon={<AlertIcon size={24} />}
        title={t.shell.error.title}
        description={t.shell.error.description}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              reset();
              void router.invalidate();
            }}
          >
            {t.shell.error.retry}
          </Button>
        }
      />
    </>
  );
}

export function RootErrorPage(props: ErrorComponentProps): React.JSX.Element {
  return (
    <ShellFrame>
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
        <div className="mx-auto w-full max-w-6xl px-4 py-8">
          <ErrorContent {...props} />
        </div>
      </main>
    </ShellFrame>
  );
}
