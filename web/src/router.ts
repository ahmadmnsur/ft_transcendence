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

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: readSession,
  validateSearch: parsePageSearch,
  component: HomePage,
});

type SignInNotice = 'password-changed' | 'password-change-unknown';
type SignInOAuth = 'failed' | 'removed' | 'suspended';

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  beforeLoad: requireSignedOut,
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
  validateSearch: (search: Record<string, unknown>): { from?: '42' } => ({
    from: search.from === 42 || search.from === '42' ? '42' : undefined,
  }),
  component: SignUpPage,
});

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

const studentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/students',
  beforeLoad: requireSession,
  validateSearch: parseStudentsSearch,
  component: StudentsPage,
});

const studentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/students/$studentId',
  beforeLoad: requireSession,
  validateSearch: parsePageSearch,
  component: StudentPage,
});

const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/friends',
  beforeLoad: requireSession,
  component: FriendsPage,
});

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

const matchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/match',
  beforeLoad: requireSession,
  component: MatchPage,
});

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

const adminHomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: (args) => requireRole(args, 'ADMIN'),
  component: AdminHomePage,
});

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
  defaultErrorComponent: ErrorContent,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

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
