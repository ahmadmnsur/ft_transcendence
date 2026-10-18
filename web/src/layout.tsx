import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiProtocolError } from './api/client';
import { logout } from './api/auth';
import { SESSION_QUERY_KEY, fetchSession, sessionQueryOptions } from './api/session';
import { useI18n } from './i18n/context';
import { languageNames, languages } from './i18n/language';
import { AlertIcon, Button, EmptyState, PersonName, SearchIcon, Select, buttonClasses } from './design';
import { RealtimeConnection } from './realtime/connection';

// The product name is never translated.
export const BRAND = '42 PeerConnect';

// One message with placeholders: the page's name, then the brand, or the
// brand alone when `name` is absent, so an Arabic name keeps `42 PeerConnect`
// in its own order. React hoists the string into <head> and removes it on
// unmount, so each page owns its title and every transition ends with the
// right one. `web/index.html` keeps its static title before the app mounts.
export function PageTitle({ name }: { name?: string }): React.JSX.Element {
  const { t, formatText } = useI18n();
  return <title>{name === undefined ? BRAND : formatText(t.shell.pageTitle, { page: name, brand: BRAND })}</title>;
}

function SiteHeader(): React.JSX.Element {
  const { t, language, setLanguage } = useI18n();
  const { data: session } = useQuery(sessionQueryOptions());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

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
      // A 401 means the session was already gone. Any other failure re-probes
      // it: signed out behaves like success, still signed in keeps the
      // session state and shows an error to try again.
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
          return;
        }
      }
    }
    signOutLocally();
    await goToSignIn();
  }

  function onLanguageChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const next = languages.find((l) => l === event.target.value);
    if (next !== undefined) setLanguage(next);
  }

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link to="/" className="rounded-lg text-lg font-semibold text-ink focus-ring">
          <bdi>{BRAND}</bdi>
        </Link>
        <nav aria-label={t.shell.header.navLabel} className="ms-auto flex min-w-0 flex-wrap items-center gap-2 max-sm:order-2 max-sm:basis-full max-sm:justify-end">
          {session?.authenticated === true ? (
            <>
              <span className="hidden max-w-40 truncate text-sm text-ink-muted sm:inline">
                <PersonName name={session.student.displayName} removed={false} />
              </span>
              <Link
                to="/students"
                className={`shrink-0 ${buttonClasses({ variant: 'secondary', size: 'sm' })}`}
              >
                {t.shell.header.studentsLink}
              </Link>
              <Link
                to="/me"
                className={`shrink-0 ${buttonClasses({ variant: 'secondary', size: 'sm' })}`}
              >
                {t.shell.header.profileLink}
              </Link>
              <Button variant="secondary" size="sm" loading={signingOut} onClick={() => void onSignOut()} className="shrink-0">
                {signingOut ? t.shell.header.signingOut : t.shell.header.signOut}
              </Button>
              {signOutFailed ? (
                <span role="alert" className="max-w-48 text-xs text-ink-danger">
                  {t.shell.header.signOutFailed}
                </span>
              ) : null}
            </>
          ) : (
            <>
              <Link
                to="/sign-in"
                className={`shrink-0 ${buttonClasses({ variant: 'secondary', size: 'sm' })}`}
              >
                {t.shell.header.signInLink}
              </Link>
              <Link to="/sign-up" className={`shrink-0 ${buttonClasses({ variant: 'primary', size: 'sm' })}`}>
                {t.shell.header.signUpLink}
              </Link>
            </>
          )}
        </nav>
        {/* Below `sm` the switcher ends the brand's line and the nav takes the next line. A button
        never shrinks its label onto two lines: one that does not fit moves to a further line, as
        French does at 360 px. The DOM keeps the desktop order: brand, nav, switcher. */}
        <Select
          hideLabel
          label={t.shell.language.label}
          value={language}
          onChange={onLanguageChange}
          className="w-32 shrink-0 max-sm:order-1 max-sm:ms-auto"
        >
          {languages.map((l) => (
            <option key={l} value={l} lang={l}>
              {languageNames[l]}
            </option>
          ))}
        </Select>
      </div>
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

// The footer sits at the bottom on short pages: the frame is a full-height
// column and the main grows. The dynamic viewport unit keeps it there on
// mobile browsers whose toolbar shrinks the visible viewport.
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
  // The page on screen: the leaf match the outlet renders. While a
  // navigation is pending, the location already names the next page but
  // this one is still shown.
  const pageId = useRouterState({ select: (state) => state.matches.at(-1)?.id });
  // The page's key moves only when one signed-in Student replaces another.
  // The page on screen keeps the Student it was mounted for until another
  // page takes its place, through any signed-out answer or pending
  // navigation in between, so A → signed out → B still remounts it (a
  // refetch can store signed out without leaving the page, and a page stays
  // on screen while the next one loads). A sign-out or a sign-in never
  // remounts it: a signed-out answer keeps the page's Student, and a page
  // entered signed out has none until the sign-in gives it one.
  const [pageKey, setPageKey] = useState(0);
  const [pageOwner, setPageOwner] = useState({ pageId, studentId });
  if (pageId !== pageOwner.pageId || (studentId !== null && studentId !== pageOwner.studentId)) {
    if (pageOwner.studentId !== null && studentId !== null && studentId !== pageOwner.studentId) {
      setPageKey((key) => key + 1);
    }
    setPageOwner({ pageId, studentId });
  }

  // On a client-side navigation that changes the pathname, move focus to
  // the main so keyboard and screen-reader users land on the new page.
  // Search-param changes and the first load keep focus where it is.
  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [pathname]);

  // §4.6, §7.5: the cookie is shared across tabs, so a fresh GET /api/session
  // (a guard, a probe, the socket's confirm-before-connect read) can name a
  // different Student than the one this tab shows, or a signed-out answer.
  // Whenever the tab leaves a signed-in Student, drop every query cached for
  // them — their email of §4.6 among it — so no page keeps rendering it. A
  // guard stores a signed-out answer without clearing the other queries
  // (`guards.ts`), so this reset is what keeps the previous Student's data
  // from reaching the next sign-in; a normal sign-out already cleared the
  // cache, so the reset there is harmless. Signed out → a Student needs none:
  // leaving the previous Student already reset. A layout effect, not a
  // passive one: on a switch to another Student, the keyed remount below
  // renders the new page from those cached queries, and the reset and the
  // updates it schedules must flush before that frame is painted.
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
          {/* §7.5, §4.6: the key remounts the page when one signed-in Student
          replaces another, so no local state of the previous Student (an
          unsaved draft, typed passwords) survives it. A Fragment, so the
          page's markup is unchanged; the socket stays outside the keyed
          element, so a switch never remounts it. */}
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

// A short human message only: never a stack or the raw server text.
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

// An error in the root route itself renders instead of the layout, so it
// brings its own shell frame around the same content.
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
