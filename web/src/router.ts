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

type SignInNotice = 'password-changed' | 'password-change-signed-out' | 'password-change-unknown';

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  beforeLoad: requireSignedOut,
  // The password change returns here with a notice; anything else is no
  // notice, so a hand-written query never shows a banner.
  validateSearch: (search: Record<string, unknown>): { notice?: SignInNotice } => ({
    notice:
      search.notice === 'password-changed' ||
      search.notice === 'password-change-signed-out' ||
      search.notice === 'password-change-unknown'
        ? search.notice
        : undefined,
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
