import type { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import type { Role } from '@shared/roles';
import { sessionQueryOptions, type SignedInStudent } from './api/session';

interface GuardArgs {
  context: { queryClient: QueryClient };
}

// Reads the session through the Query client with a fresh probe on every
// guarded navigation: a role change or revocation takes effect on the next
// request (§5.3), so a cached session must never admit anyone. Concurrent
// callers still share the one in-flight request.
export async function requireSession({ context }: GuardArgs): Promise<{ student: SignedInStudent }> {
  const session = await context.queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 });
  if (!session.authenticated) throw redirect({ to: '/sign-in' });
  return { student: session.student };
}

// `/`, `/privacy` and `/terms`, readable signed in or out: the same fresh
// probe as requireSession, without its redirect. `/` picks the feed or the
// landing page from the session query it fills (§3.5.1's note of
// 2026-10-25). On the legal pages it gives the header its final height before
// the router scrolls to a `#` link; otherwise the header would grow over the
// heading when the session answered.
export async function readSession({ context }: GuardArgs): Promise<void> {
  await context.queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 });
}

// requireSession first, then the role check: a student without one of the
// roles returns to `/` (§3.5.1). Takes a list because the moderation routes
// admit both PEER_MODERATOR and ADMIN (§5.3).
export async function requireRole(
  { context }: GuardArgs,
  ...roles: Array<Role>
): Promise<{ student: SignedInStudent }> {
  const { student } = await requireSession({ context });
  if (!roles.includes(student.role)) throw redirect({ to: '/' });
  return { student };
}

// The signed-out pages (`/sign-in`, `/sign-up`): a signed-in visitor goes to
// `/` instead, so normal use never reaches the `already_signed_in` refusal a
// signed-in sign-up or sign-in would answer (§3.8.2: a correctly built UI
// never shows a refusal it could avoid).
export async function requireSignedOut({ context }: GuardArgs): Promise<void> {
  const session = await context.queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 });
  if (session.authenticated) throw redirect({ to: '/' });
}
