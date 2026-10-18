import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, createRoute, createRouter } from '@tanstack/react-router';
import { setUnauthorizedHandler } from './api/client';
import { SESSION_QUERY_KEY, fetchSession } from './api/session';
import { ErrorContent, NotFoundPage, RootErrorPage, RootLayout } from './layout';
import { requireSession, requireSignedOut } from './guards';
import { HomePage } from './pages/HomePage';
import { MePage } from './pages/MePage';
import { PrivacyPage } from './pages/PrivacyPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { StudentPage } from './pages/StudentPage';
import { StudentsPage, parseStudentsSearch } from './pages/StudentsPage';
import { TermsPage } from './pages/TermsPage';
import { queryClient } from './queryClient';

export interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RootErrorPage,
  notFoundComponent: NotFoundPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: requireSession,
  component: HomePage,
});

type SignInNotice = 'password-changed' | 'password-change-unknown';

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  beforeLoad: requireSignedOut,
  // The password change returns here with a notice, and 42's failure path
  // with `oauth=failed`; anything else is no notice, so a hand-written query
  // never shows a banner.
  validateSearch: (search: Record<string, unknown>): { notice?: SignInNotice; oauth?: 'failed' } => ({
    notice:
      search.notice === 'password-changed' || search.notice === 'password-change-unknown'
        ? search.notice
        : undefined,
    oauth: search.oauth === 'failed' ? 'failed' : undefined,
  }),
  component: SignInPage,
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  beforeLoad: requireSignedOut,
  component: SignUpPage,
});

const meRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/me',
  beforeLoad: requireSession,
  component: MePage,
});

// §3.5.1, §6.2: the Advanced search, for any signed-in Student. Its filters,
// sort and page are search params, checked before any request is sent.
const studentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/students',
  beforeLoad: requireSession,
  validateSearch: parseStudentsSearch,
  component: StudentsPage,
});

// §3.5.1: any signed-in Student reads another's profile; a Removed Student
// renders as the tombstone there (§4.6).
const studentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/students/$studentId',
  beforeLoad: requireSession,
  component: StudentPage,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy',
  component: PrivacyPage,
});

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms',
  component: TermsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  signUpRoute,
  meRoute,
  studentsRoute,
  studentRoute,
  privacyRoute,
  termsRoute,
]);

export const router = createRouter({
  routeTree,
  context: { queryClient },
  // A child route's failure renders inside the layout's outlet, so the
  // header and footer stay on the error page.
  defaultErrorComponent: ErrorContent,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// A 401 re-probes the session with a fresh fetch, never the cache. When it
// reports signed out, the signed-out student's cached server state is
// dropped, the session query takes the signed-out value, and the shell
// replaces to `/sign-in` (§3.8.2). Concurrent 401s share one re-probe and
// one navigation; the original requests still reject with their 401.
let recheck: Promise<void> | null = null;

function handleUnauthorized(): Promise<void> {
  if (recheck) return recheck;
  recheck = (async () => {
    let session;
    try {
      session = await fetchSession();
    } catch {
      return;
    }
    if (!session.authenticated) {
      queryClient.clear();
      queryClient.setQueryData(SESSION_QUERY_KEY, session);
      await router.navigate({ to: '/sign-in', replace: true });
    }
  })().finally(() => {
    recheck = null;
  });
  return recheck;
}

setUnauthorizedHandler(() => handleUnauthorized());
