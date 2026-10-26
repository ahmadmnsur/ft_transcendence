import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, createRoute, createRouter, lazyRouteComponent } from '@tanstack/react-router';
import { setUnauthorizedHandler } from './api/client';
import { fetchSession, setSignedOut } from './api/session';
import { ErrorContent, NotFoundPage, RootErrorPage, RootLayout } from './layout';
import { readSession, readSessionIfUp, requireRole, requireSession, requireSignedOut } from './guards';
import { AdminHomePage } from './pages/AdminHomePage';
import { AdminMatchPage } from './pages/AdminMatchPage';
import { AdminRoundPage } from './pages/AdminRoundPage';
import { AdminRoundsPage } from './pages/AdminRoundsPage';
import { AdminUserPage } from './pages/AdminUserPage';
import { AdminUsersPage, parseAdminUsersSearch } from './pages/AdminUsersPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { FriendsPage } from './pages/FriendsPage';
import { HomePage } from './pages/HomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { MatchDetailPage } from './pages/MatchDetailPage';
import { MatchPage } from './pages/MatchPage';
import { MatchesPage } from './pages/MatchesPage';
import { MePage } from './pages/MePage';
import { MessagesPage } from './pages/MessagesPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ReviewPage } from './pages/ReviewPage';
import { RulesPage } from './pages/RulesPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { StudentPage } from './pages/StudentPage';
import { StudentsPage, parseStudentsSearch } from './pages/StudentsPage';
import { TermsPage } from './pages/TermsPage';
import { ThreadPage } from './pages/ThreadPage';
import { PromptsPage } from './pages/PromptsPage';
import { PromptDetailPage } from './pages/PromptDetailPage';
import { AdminPromptsPage } from './pages/AdminPromptsPage';
import { AdminReportsPage, parseAdminReportsSearch } from './pages/AdminReportsPage';
import { ModerationPage } from './pages/ModerationPage';
import { queryClient } from './queryClient';
import { parsePageSearch } from './search';

export interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RootErrorPage,
  notFoundComponent: NotFoundPage,
});

// §3.5.1, §6.0.1: the feed, paged by `page`, for a signed-in Student, and
// the landing page for a signed-out visitor (§3.5.1's note of 2026-10-25).
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: readSession,
  validateSearch: parsePageSearch,
  component: HomePage,
});

type SignInNotice = 'password-changed' | 'password-change-unknown';
// 42's one failure path names `failed`; a Removed or Suspended Student by the
// 42 id names its own (§5.6 B).
type SignInOAuth = 'failed' | 'removed' | 'suspended';

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  beforeLoad: requireSignedOut,
  // The password change returns here with a notice, and 42's failure paths
  // with `oauth`; anything else is no notice, so a hand-written query never
  // shows a banner.
  validateSearch: (search: Record<string, unknown>): { notice?: SignInNotice; oauth?: SignInOAuth } => ({
    notice:
      search.notice === 'password-changed' || search.notice === 'password-change-unknown'
        ? search.notice
        : undefined,
    oauth:
      search.oauth === 'failed' || search.oauth === 'removed' || search.oauth === 'suspended'
        ? search.oauth
        : undefined,
  }),
  component: SignInPage,
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  beforeLoad: requireSignedOut,
  // §5.6 B: a first 42 login lands here with `from=42`, which selects the 42
  // sign-up form; anything else is the ordinary one. The default search
  // parser JSON-parses values, so the server's redirect `/sign-up?from=42`
  // arrives as the NUMBER 42 (as `parseStudentsSearch` notes for `?q=42`) —
  // accept it and the string alike.
  validateSearch: (search: Record<string, unknown>): { from?: '42' } => ({
    from: search.from === 42 || search.from === '42' ? '42' : undefined,
  }),
  component: SignUpPage,
});

// 42's Connect and Confirm answers on the profile page (§5.6 B, C); anything
// else is no notice, so a hand-written query never shows a banner.
type MeOAuth = 'connected' | 'in_use' | 'failed' | 'confirmed';

const meRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/me',
  beforeLoad: requireSession,
  validateSearch: (search: Record<string, unknown>): { oauth?: MeOAuth } => ({
    oauth:
      search.oauth === 'connected' ||
      search.oauth === 'in_use' ||
      search.oauth === 'failed' ||
      search.oauth === 'confirmed'
        ? search.oauth
        : undefined,
  }),
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
// renders as the tombstone there (§4.6). Its Posts are paged by `page`.
const studentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/students/$studentId',
  beforeLoad: requireSession,
  validateSearch: parsePageSearch,
  component: StudentPage,
});

// §3.5.1: the signed-in Student's own `/friends`: Friends with Presence,
// friend requests and Blocks.
const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/friends',
  beforeLoad: requireSession,
  component: FriendsPage,
});

// §6.5: `/messages`, the signed-in Student's Direct Messages list, and one
// peer's page at `/messages/$peerId`.
const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/messages',
  beforeLoad: requireSession,
  component: MessagesPage,
});

const threadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/messages/$peerId',
  beforeLoad: requireSession,
  component: ThreadPage,
});

// §3.5.1: the signed-in Student's Match in the open Round, with accept and
// decline.
const matchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/match',
  beforeLoad: requireSession,
  component: MatchPage,
});

// §3.5.1, §6.6: the signed-in Student's own Matches, paged by `page`, and one
// of them. Only the pair reads a Match: the API answers 404 to anyone else.
const matchesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matches',
  beforeLoad: requireSession,
  validateSearch: parsePageSearch,
  component: MatchesPage,
});

const matchDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matches/$matchId',
  beforeLoad: requireSession,
  component: MatchDetailPage,
});

// §3.5.1: the header's one Admin link, a tile for each Admin page below. A
// Student without the role returns to `/`.
const adminHomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: (args) => requireRole(args, 'ADMIN'),
  component: AdminHomePage,
});

// §3.5.1: the Admin's Round pages. A Student without the role returns to `/`,
// and the API refuses the same reads with 403 (§5.3).
const adminRoundsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/rounds',
  beforeLoad: (args) => requireRole(args, 'ADMIN'),
  component: AdminRoundsPage,
});

const adminAnalyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/analytics',
  beforeLoad: (args) => requireRole(args, 'ADMIN'),
  component: lazyRouteComponent(() => import('./pages/AdminAnalyticsPage'), 'AdminAnalyticsPage'),
});

const adminRoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/rounds/$roundId',
  beforeLoad: (args) => requireRole(args, 'ADMIN'),
  component: AdminRoundPage,
});

const adminMatchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/matches/$matchId',
  beforeLoad: (args) => requireRole(args, 'ADMIN'),
  component: AdminMatchPage,
});

// §3.5.1, §6.12: the Users table and one account. Its filters, sort and page
// are search params, checked before any request is sent.
const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/users',
  beforeLoad: (args) => requireRole(args, 'ADMIN'),
  validateSearch: parseAdminUsersSearch,
  component: AdminUsersPage,
});

const adminUserRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/users/$studentId',
  beforeLoad: (args) => requireRole(args, 'ADMIN'),
  component: AdminUserPage,
});

const promptsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/prompts',
  beforeLoad: requireSession,
  validateSearch: parsePageSearch,
  component: PromptsPage,
});

// A Prompt and its answers, paged by `page`.
const promptDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/prompts/$promptId',
  beforeLoad: requireSession,
  validateSearch: parsePageSearch,
  component: PromptDetailPage,
});

const adminPromptsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/prompts',
  beforeLoad: (args) => requireRole(args, 'ADMIN'),
  validateSearch: parsePageSearch,
  component: AdminPromptsPage,
});

// §3.5.1: a Peer Moderator's queue. An Admin works the same groups, with
// reporters, at `/admin/reports`, with the resolved audit beside them; the
// API refuses a Student both with 403 (§5.3).
const moderationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moderation',
  beforeLoad: (args) => requireRole(args, 'PEER_MODERATOR'),
  component: ModerationPage,
});

const adminReportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/reports',
  beforeLoad: (args) => requireRole(args, 'ADMIN'),
  validateSearch: parseAdminReportsSearch,
  component: AdminReportsPage,
});

const reviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matches/$matchId/review',
  beforeLoad: requireSession,
  component: ReviewPage,
});
const feedbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/feedback',
  beforeLoad: requireSession,
  validateSearch: parsePageSearch,
  component: FeedbackPage,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy',
  beforeLoad: readSessionIfUp,
  component: PrivacyPage,
});

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms',
  beforeLoad: readSessionIfUp,
  component: TermsPage,
});

const rulesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rules',
  beforeLoad: requireSession,
  component: RulesPage,
});

const leaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leaderboard',
  beforeLoad: requireSession,
  component: LeaderboardPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  signUpRoute,
  meRoute,
  studentsRoute,
  studentRoute,
  friendsRoute,
  messagesRoute,
  threadRoute,
  matchRoute,
  matchesRoute,
  matchDetailRoute,
  reviewRoute,
  feedbackRoute,
  adminHomeRoute,
  adminRoundsRoute,
  adminAnalyticsRoute,
  adminRoundRoute,
  adminMatchRoute,
  adminUsersRoute,
  adminUserRoute,
  promptsRoute,
  promptDetailRoute,
  adminPromptsRoute,
  moderationRoute,
  adminReportsRoute,
  privacyRoute,
  termsRoute,
  rulesRoute,
  leaderboardRoute,
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
// replaces to `/sign-in` (§3.8.2). Already there, shown or still loading, it
// runs that page's guards again instead: the notice in its query (the
// password change's) survives a late 401, and a guard whose session read the
// cache clear cancelled runs again. Concurrent 401s share one re-probe and
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
      setSignedOut(queryClient);
      if (router.latestLocation.pathname === '/sign-in') await router.invalidate();
      else await router.navigate({ to: '/sign-in', replace: true });
    }
  })().finally(() => {
    recheck = null;
  });
  return recheck;
}

setUnauthorizedHandler(() => handleUnauthorized());
