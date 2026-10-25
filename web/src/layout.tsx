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
export const BRAND = '21 Beirut';

// One message with placeholders: the page's name, then the brand, or the
// brand alone when `name` is absent, so an Arabic name keeps `21 Beirut`
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

  // The logo is drawn, not set in a font, so it looks the same on every
  // machine: BEIRUT is Liberation Sans Bold traced into paths. Its label is the
  // brand, which names the link. It is inline, not an <img>, so its colors are
  // classes: a forced-colors theme repaints it like the links instead of
  // leaving it dark on a dark page. It may shrink: signed in below 360 px the
  // row is too narrow for it, and it must not push the language menu off.
  const brandLink = (
    <Link to="/" className="inline-flex h-9 min-w-0 items-center rounded-lg focus-ring">
      <svg role="img" aria-label={BRAND} viewBox="0.8 10 274 72.3" fill="currentColor" className="h-9 w-auto max-w-full">
        <g className="text-primary-700 forced-colors:text-[LinkText]">
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
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          {brandLink}
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
    <header className="relative border-b border-line bg-surface">
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
            className="absolute end-0 top-full z-30 mt-2 w-60 rounded-xl border border-line bg-surface p-1 shadow-lg"
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
          className="absolute inset-x-0 top-full z-30 border-y border-line bg-surface shadow-lg md:hidden"
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
