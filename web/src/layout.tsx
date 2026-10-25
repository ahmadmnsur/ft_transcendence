import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiProtocolError } from './api/client';
import { logout } from './api/auth';
import { SESSION_QUERY_KEY, fetchSession, sessionQueryOptions } from './api/session';
import { useI18n } from './i18n/context';
import { languageNames, languages } from './i18n/language';
import { AlertIcon, Button, ChevronDownIcon, EmptyState, IconButton, MenuIcon, PersonName, SearchIcon, Select, buttonClasses } from './design';
import { RealtimeConnection } from './realtime/connection';
import { MessageUpdates } from './messages/MessageUpdates';
import { RoundUpdates } from './matching/RoundUpdates';
import { FeedUpdates } from './feed/FeedUpdates';
import { PresenceUpdates } from './social/PresenceUpdates';
import { useDisclosure } from './shell/useDisclosure';

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

// The header's links, each a route every role below may open. The bar holds
// a week's work: the feed, the Match, the Prompt, then the people. The
// account menu holds the Student's own pages. A Peer Moderator gets one more
// link, their queue; an Admin gets `/admin`, which lists every Admin page
// (§3.5.1).
type BarPath = '/' | '/match' | '/prompts' | '/messages' | '/students' | '/friends' | '/moderation' | '/admin';
type AccountPath = '/me' | '/feedback' | '/leaderboard' | '/rules';

// The link matches its page and every page under it (`/admin` stays marked on
// `/admin/users`), whatever the search params; the feed matches `/` alone.
function activeOptions(to: string): { exact: boolean; includeSearch: false } {
  return { exact: to === '/', includeSearch: false };
}

// The current page's link is marked by the `aria-current` the router sets.
const barLinkClass =
  'inline-flex items-center whitespace-nowrap rounded-t-lg border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors duration-150 hover:text-ink focus-ring aria-[current=page]:border-primary-600 aria-[current=page]:text-primary-700';
const panelItemClass =
  'block w-full rounded-lg px-3 py-2 text-start text-sm text-ink transition-colors duration-150 hover:bg-surface-muted focus-ring pointer-coarse:py-3 aria-[current=page]:bg-primary-50 aria-[current=page]:font-medium aria-[current=page]:text-primary-700';
// Tailwind's `md`: from here the bar and the account menu show, below it the
// phone Menu.
const MD_QUERY = '(width >= 48rem)';
// The header stays at the top of the window while the page scrolls under it
// (§3.5.1), over the page's own positioned parts and under the skip link.
const headerClass = 'sticky top-0 z-40 border-b border-line bg-surface';

// A header panel lies over the page below the header and moves with it, so
// the page's scroll never reaches the panel's end: taller than the window
// below the header, it scrolls on its own.
const panelFitClass = 'max-h-[calc(100dvh-var(--header-height))] overflow-y-auto overscroll-contain';

// The header's height as `--header-height` on the root element, measured once
// as the header mounts, before the router scrolls a page opened at a `#` link,
// then on each resize: it moves with the width, the language, a sign-in or a
// sign-out, and the links a role adds. The page's scroll padding reads it
// (`index.css`), so whatever the browser scrolls into view, a focused field, a
// notice or the heading a `#` link opens, stops below the header, not behind
// it; so does `panelFitClass`. React runs the cleanup when the header unmounts.
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
  const { data: session } = useQuery(sessionQueryOptions());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  // Below `md` one button shows every link under the header's line; from
  // `md` the bar shows them and the account menu sits beside the switcher.
  const phoneMenu = useDisclosure<HTMLElement>();
  const accountMenu = useDisclosure<HTMLDivElement>();
  const closePhoneMenu = phoneMenu.close;
  const closeAccountMenu = accountMenu.close;

  // Each menu shows on one side of `md` only, so crossing it closes both: a
  // panel hidden open would show again when the window crosses back.
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
          // The error shows inside the panel, which may have closed while
          // the sign-out ran: open the one this width shows. Focus stays
          // where it is.
          if (window.matchMedia(MD_QUERY).matches) accountMenu.show();
          else phoneMenu.show();
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

  const student = session?.authenticated === true ? session.student : null;
  const barLinks: Array<{ to: BarPath; label: string }> = [
    { to: '/', label: t.feed.title },
    { to: '/match', label: copy.matchLink },
    { to: '/prompts', label: t.prompts.title },
    { to: '/messages', label: copy.messagesLink },
    { to: '/students', label: copy.studentsLink },
    { to: '/friends', label: copy.friendsLink },
  ];
  // §3.5.1: the moderation queue is a Peer Moderator's alone and the Admin
  // pages an Admin's; the session read here only decides whether the link
  // shows, and the route guards and the API both check the role again.
  if (student?.role === 'PEER_MODERATOR') barLinks.push({ to: '/moderation', label: copy.moderationLink });
  if (student?.role === 'ADMIN') barLinks.push({ to: '/admin', label: copy.adminLink });
  const accountLinks: Array<{ to: AccountPath; label: string }> = [
    { to: '/me', label: copy.profileLink },
    { to: '/feedback', label: t.reviews.feedback },
    { to: '/leaderboard', label: t.leaderboard.title },
    { to: '/rules', label: t.progress.rules.nav },
  ];

  const languageSwitcher = (
    <Select
      hideLabel
      label={t.shell.language.label}
      value={language}
      onChange={onLanguageChange}
      className={student !== null ? 'w-32 shrink-0' : 'w-32 shrink-0 max-sm:order-1 max-sm:ms-auto'}
    >
      {languages.map((l) => (
        <option key={l} value={l} lang={l}>
          {languageNames[l]}
        </option>
      ))}
    </Select>
  );

  if (student === null) {
    return (
      <header ref={followHeaderHeight} className={headerClass}>
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="rounded-lg text-lg font-semibold text-ink focus-ring">
            <bdi>{BRAND}</bdi>
          </Link>
          <nav aria-label={copy.navLabel} className="ms-auto flex min-w-0 flex-wrap items-center gap-2 max-sm:order-2 max-sm:basis-full max-sm:justify-end">
            <Link to="/sign-in" className={`shrink-0 ${buttonClasses({ variant: 'secondary', size: 'sm' })}`}>
              {copy.signInLink}
            </Link>
            <Link to="/sign-up" className={`shrink-0 ${buttonClasses({ variant: 'primary', size: 'sm' })}`}>
              {copy.signUpLink}
            </Link>
          </nav>
          {/* Below `sm` the switcher ends the brand's line and the nav takes the next line. A button
          never shrinks its label onto two lines: one that does not fit moves to a further line, as
          French does at 360 px. The DOM keeps the desktop order: brand, nav, switcher. */}
          {languageSwitcher}
        </div>
      </header>
    );
  }

  // A failed sign-out shows its error under the button, in the open panel,
  // where the panel cannot cover it. While it runs the button stays
  // focusable, as `Button` does when loading, so a keyboard user keeps their
  // place and Enter tries again after a failure; `onSignOut` ignores a second
  // press meanwhile.
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
        <Link to="/" className="min-w-0 rounded-lg text-lg font-semibold text-ink focus-ring">
          <bdi>{BRAND}</bdi>
        </Link>
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
        <IconButton {...phoneMenu.buttonProps} label={copy.menu} className="ms-auto md:hidden">
          <MenuIcon size={20} />
        </IconButton>
        {/* The panel follows its button in the DOM, so Tab reaches its links
        before the switcher, and lies over the page under the header's line. */}
        <nav
          aria-label={copy.navLabel}
          {...phoneMenu.panelProps}
          className={`absolute inset-x-0 top-full z-30 ${panelFitClass} border-y border-line bg-surface shadow-lg md:hidden`}
        >
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
              {signOut}
            </div>
          </div>
        </nav>
        {/* The switcher ends the header's line at every width (§3.5.5). */}
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
          <PresenceUpdates />
          <MessageUpdates />
          <RoundUpdates />
          <FeedUpdates />
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
